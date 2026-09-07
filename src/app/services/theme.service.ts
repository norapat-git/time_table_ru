import { Injectable, signal, computed } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'app_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _theme = signal<AppTheme>(this.getInitialTheme());

  readonly currentTheme = this._theme.asReadonly();

  readonly isDark = computed<boolean>(() => {
    return this._theme() === 'dark';
  });

  constructor() {
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
      if (saved === 'dark') {
        return 'dark';
      }
    } catch {}
    return 'light';
  }

  private applyThemeToDom(dark: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const themeStr = dark ? 'dark' : 'light';
    root.setAttribute('data-theme', themeStr);
    root.style.colorScheme = themeStr;
  }
}

