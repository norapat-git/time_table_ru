import { Injectable, signal, computed } from '@angular/core';

export type AppTheme = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'app_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _theme = signal<AppTheme>(this.getInitialTheme());
  private readonly _systemDark = signal<boolean>(this.checkSystemDark());

  readonly currentTheme = this._theme.asReadonly();

  readonly isDark = computed<boolean>(() => {
    const t = this._theme();
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return this._systemDark();
  });

  constructor() {
    this.initSystemListener();
    this.applyThemeToDom(this.isDark());
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this.isDark() ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: AppTheme): void {
    this._theme.set(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    this.applyThemeToDom(this.isDark());
  }

  private getInitialTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved;
      }
    } catch {}
    return 'auto';
  }

  private checkSystemDark(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  private initSystemListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        this._systemDark.set(e.matches);
        if (this._theme() === 'auto') {
          this.applyThemeToDom(this.isDark());
        }
      });
    }
  }

  private applyThemeToDom(dark: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const themeStr = dark ? 'dark' : 'light';
    root.setAttribute('data-theme', themeStr);
    root.style.colorScheme = themeStr;
  }
}
