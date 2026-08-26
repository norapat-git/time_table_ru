import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { DecodedUser, JwtHeader, JwtPayload, UserRole } from '../models/auth.model';
import {
  extractUserFromToken,
  formatRemainingTime,
  generateMockJwt,
  getJwtHeader,
  getJwtPayload,
  getTokenExpirationDate,
  getTokenRemainingSeconds,
  isTokenExpired,
} from '../utils/jwt.util';

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
    const targetUrl = window.location.port === '4200' ? 'http://localhost:4000/api/service/login' : '/api/service/login';
    return this.http.post<{ success: boolean; message: string; results?: any }>(targetUrl, { email, password }).pipe(
      tap((res) => {
        if (res && res.success && res.results) {
          const userResult = res.results;
          const thaiFullName = userResult.USER_THAINAME || 'นายทดสอบ พัฒนาระบบ';
          const engFullName = userResult.USER_ENGNAME || 'TODSOB PATTANARABOB';
          const userEmail = userResult.USER_EMAIL || email;

          // Generate JWT token with user claims
          const payload: Partial<JwtPayload> = {
            userId: 'USER-' + userEmail.split('@')[0],
            username: userEmail,
            email: userEmail,
            firstNameTH: thaiFullName,
            lastNameTH: '',
            role: 'ADMIN',
            roles: ['ADMIN'],
            department: 'สถาบันภาษา มหาวิทยาลัยรามคำแหง',
          };
          const token = generateMockJwt(payload, 480); // 8 hours session

          const userObj: DecodedUser = {
            userId: 'USER-' + userEmail.split('@')[0],
            username: userEmail,
            email: userEmail,
            displayName: thaiFullName,
            role: 'ADMIN',
            roles: ['ADMIN'],
            department: 'สถาบันภาษา มหาวิทยาลัยรามคำแหง',
            rawPayload: payload as JwtPayload,
          };

          this._token.set(token);
          this._user.set(userObj);
          this._remainingSeconds.set(getTokenRemainingSeconds(token));

          try {
            localStorage.setItem(STORAGE_KEY_TOKEN, token);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
          } catch {}

          this.startTimer();
        }
      }),
      catchError((err) => {
        const errorMsg = err?.error?.message || 'ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้';
        return of({ success: false, message: errorMsg });
      })
    );
  }

  /**
   * Quick login using preset roles (Admin, Instructor, Staff, Student, Expired)
   */
  loginWithPreset(preset: 'ADMIN' | 'INSTRUCTOR' | 'STAFF' | 'STUDENT' | 'EXPIRED'): void {
    let mockClaims: Partial<JwtPayload> = {};
    let expiresInMinutes = 60;

    switch (preset) {
      case 'ADMIN':
        mockClaims = {
          userId: 'ADM-001',
          username: 'dev07@ru.ac.th',
          email: 'dev07@ru.ac.th',
          firstNameTH: 'นายทดสอบ',
          lastNameTH: 'พัฒนาระบบ',
          role: 'ADMIN',
          roles: ['ADMIN', 'STAFF'],
          department: 'สถาบันภาษา มหาวิทยาลัยรามคำแหง',
        };
        expiresInMinutes = 480;
        break;
      case 'INSTRUCTOR':
        mockClaims = {
          userId: 'INS-101',
          username: 'somchai.j@ru.ac.th',
          email: 'somchai.j@ru.ac.th',
          firstNameTH: 'อาจารย์สมชาย',
          lastNameTH: 'ใจดี',
          role: 'INSTRUCTOR',
          roles: ['INSTRUCTOR'],
          department: 'สาขาวิชาภาษาอังกฤษ',
        };
        expiresInMinutes = 120;
        break;
      case 'STAFF':
        mockClaims = {
          userId: 'STF-201',
          username: 'wilai.k@ru.ac.th',
          email: 'wilai.k@ru.ac.th',
          firstNameTH: 'วิไล',
          lastNameTH: 'กิจเจริญ',
          role: 'STAFF',
          roles: ['STAFF'],
          department: 'งานบริการการศึกษา',
        };
        expiresInMinutes = 90;
        break;
      case 'STUDENT':
        mockClaims = {
          userId: 'STD-65001',
          username: 'tanawat.p@rumail.ru.ac.th',
          email: 'tanawat.p@rumail.ru.ac.th',
          firstNameTH: 'ธนวัฒน์',
          lastNameTH: 'ปัญญาดี',
          role: 'STUDENT',
          roles: ['STUDENT'],
          department: 'นักศึกษา',
        };
        expiresInMinutes = 60;
        break;
      case 'EXPIRED':
        mockClaims = {
          userId: 'EXP-999',
          username: 'expired.user',
          email: 'expired@ru.ac.th',
          firstNameTH: 'โทเค็น',
          lastNameTH: 'หมดอายุ',
          role: 'INSTRUCTOR',
          roles: ['INSTRUCTOR'],
        };
        expiresInMinutes = -10; // Expired 10 minutes ago
        break;
    }

    const token = generateMockJwt(mockClaims, expiresInMinutes);
    if (preset === 'EXPIRED') {
      this._token.set(token);
      this._user.set(extractUserFromToken(token));
      this._remainingSeconds.set(0);
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
      } catch {}
    } else {
      this.loginWithToken(token);
    }
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
      const targetUrl = window.location.port === '4200' ? 'http://localhost:4000/api/service/logout' : '/api/service/logout';
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
