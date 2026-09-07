import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { DecodedUser, JwtHeader, JwtPayload, UserRole } from '../models/auth.model';
import {
  extractUserFromToken,
  formatRemainingTime,
  getJwtHeader,
  getJwtPayload,
  getTokenExpirationDate,
  getTokenRemainingSeconds,
  isTokenExpired,
} from '../utils/jwt.util';
import { environment } from '../../environment/env';

const STORAGE_KEY_TOKEN = 'app_auth_token';
const STORAGE_KEY_USER = 'app_auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Core Signals
  private readonly _token = signal<string | null>(this.getStoredToken());
  private readonly _user = signal<DecodedUser | null>(this.getStoredUser());
  private readonly _remainingSeconds = signal<number>(0);
  private readonly _authModalOpen = signal<boolean>(false);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Public Computed Signals
  readonly token = this._token.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly remainingSeconds = this._remainingSeconds.asReadonly();
  readonly isAuthModalOpen = this._authModalOpen.asReadonly();

  readonly isAuthenticated = computed(() => {
    const t = this._token();
    const u = this._user();
    return !!t && !!u && this._remainingSeconds() > 0;
  });

  readonly userRole = computed<UserRole>(() => {
    return this._user()?.role ?? 'ADMIN';
  });

  readonly remainingTimeFormatted = computed(() => {
    return formatRemainingTime(this._remainingSeconds());
  });

  readonly tokenExpiresAt = computed<Date | null>(() => {
    const t = this._token();
    if (!t) return null;
    return getTokenExpirationDate(t);
  });

  constructor() {
    const initialToken = this._token();
    if (initialToken && !isTokenExpired(initialToken)) {
      this.processToken(initialToken, false);
      this.startTimer();
    } else {
      this.clearSession();
    }
  }

  /**
   * Login with real Backend API (Microsoft 365 + RG_SCHEDULE_ACCOUNT)
   */
  login(email: string, password: string): Observable<{ success: boolean; message: string; results?: any }> {
    const targetUrl = `${environment.apiUrl}/login`;
    return this.http.post<{ success: boolean; message: string; token?: string; results?: any }>(targetUrl, { email, password }).pipe(
      tap((res) => {
        if (res && res.success && res.token) {
          const decodedUser = extractUserFromToken(res.token);
          if (decodedUser) {
            this._token.set(res.token);
            this._user.set(decodedUser);
            this._remainingSeconds.set(getTokenRemainingSeconds(res.token));

            try {
              localStorage.setItem(STORAGE_KEY_TOKEN, res.token);
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(decodedUser));
            } catch {}

            this.startTimer();
          }
        }
      }),
      catchError((err) => {
        const errorMsg = err?.error?.message || 'ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้';
        return of({ success: false, message: errorMsg });
      })
    );
  }

  /**
   * Process and validate a JWT string into signals
   */
  private processToken(token: string, persist: boolean = true): boolean {
    if (!token || isTokenExpired(token)) {
      this.clearSession();
      return false;
    }

    const user = extractUserFromToken(token);
    if (!user) {
      this.clearSession();
      return false;
    }

    this._token.set(token);
    this._user.set(user);
    this._remainingSeconds.set(getTokenRemainingSeconds(token));

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } catch {}
    }

    return true;
  }

  /**
   * Login with raw JWT string
   */
  loginWithToken(token: string): boolean {
    const success = this.processToken(token, true);
    if (success) {
      this.startTimer();
    }
    return success;
  }

  /**
   * Log out the current user and update USER_STATEOUT_TIME in Oracle DB
   */
  logout(): void {
    const userEmail = this._user()?.email;
    if (userEmail) {
      const targetUrl = `${environment.apiUrl}/logout`;
      this.http.post(targetUrl, { email: userEmail }).subscribe({
        next: () => {},
        error: () => {},
      });
    }
    this.clearSession();
    this.stopTimer();
  }

  /**
   * Clears storage and resets reactive states
   */
  private clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {}
    this._token.set(null);
    this._user.set(null);
    this._remainingSeconds.set(0);
  }

  getToken(): string | null {
    return this._token();
  }

  hasRole(roles: UserRole | UserRole[]): boolean {
    const current = this.userRole();
    if (Array.isArray(roles)) {
      return roles.includes(current);
    }
    return current === roles;
  }

  inspectToken(token: string): {
    header: JwtHeader | null;
    payload: JwtPayload | null;
    isExpired: boolean;
    expiresAt: Date | null;
    remainingSec: number;
    user: DecodedUser | null;
  } {
    return {
      header: getJwtHeader(token),
      payload: getJwtPayload(token),
      isExpired: isTokenExpired(token),
      expiresAt: getTokenExpirationDate(token),
      remainingSec: getTokenRemainingSeconds(token),
      user: extractUserFromToken(token),
    };
  }

  openAuthModal(): void {
    this._authModalOpen.set(true);
  }

  closeAuthModal(): void {
    this._authModalOpen.set(false);
  }

  private startTimer(): void {
    this.stopTimer();
    this.updateRemaining();

    this.timerInterval = setInterval(() => {
      this.updateRemaining();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateRemaining(): void {
    const token = this._token();
    if (!token) {
      this._remainingSeconds.set(0);
      return;
    }

    const remaining = getTokenRemainingSeconds(token);
    this._remainingSeconds.set(Math.max(0, remaining));

    if (remaining <= 0 && this._user()) {
      this.logout();
    }
  }

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  }

  private getStoredUser(): DecodedUser | null {
    try {
      const str = localStorage.getItem(STORAGE_KEY_USER);
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  }
}
