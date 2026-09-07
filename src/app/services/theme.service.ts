import { Injectable, signal, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';

export type AppTheme = 'light' | 'dark';
export type AppThemePreference = 'auto' | 'dark' | 'light';

export const THEME_PREF_STORAGE_KEY = 'app_theme_pref';
export const LEGACY_THEME_STORAGE_KEY = 'app_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly toastService = inject(ToastService);

  // User preference: 'auto' (detect from Windows/extension) | 'dark' | 'light'
  private readonly _preference = signal<AppThemePreference>(this.getInitialPreference());

  // Detected Windows / OS Dark Mode status
  private readonly _systemPrefersDark = signal<boolean>(this.checkSystemPrefersDark());

  // Detected Extension Dark Mode status (Dark Reader, Night Eye, etc.)
  private readonly _extensionPrefersDark = signal<boolean>(this.checkExtensionDark());

  // Readonly signals for UI bindings
  readonly preference = this._preference.asReadonly();
  readonly systemPrefersDark = this._systemPrefersDark.asReadonly();
  readonly extensionPrefersDark = this._extensionPrefersDark.asReadonly();

  // Active theme calculation
  readonly isDark = computed<boolean>(() => {
    const pref = this._preference();
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    // When 'auto': true if either Windows OS or Browser Extension is in Dark Mode
    return this._systemPrefersDark() || this._extensionPrefersDark();
  });

  readonly currentTheme = computed<AppTheme>(() => (this.isDark() ? 'dark' : 'light'));

  readonly modeDescription = computed<string>(() => {
    const pref = this._preference();
    if (pref === 'auto') {
      const source = this._extensionPrefersDark()
        ? 'ตาม Extension'
        : (this._systemPrefersDark() ? 'ตาม Windows' : 'ตามระบบ');
      return `อัตโนมัติ (${source}: ${this.isDark() ? 'โหมดมืด' : 'โหมดสว่าง'})`;
    }
    return pref === 'dark' ? 'โหมดมืด (กำหนดเอง)' : 'โหมดสว่าง (กำหนดเอง)';
  });

  private mediaQueryList: MediaQueryList | null = null;
  private observer: MutationObserver | null = null;

  constructor() {
    this.initSystemThemeListener();
    this.initExtensionObserver();
    this.applyThemeToDom(this.isDark());
  }

  /**
   * Toggle theme in cycle:
   * auto -> dark -> light -> auto
   */
  toggleTheme(): void {
    const currentPref = this._preference();
    if (currentPref === 'auto') {
      // Toggle to opposite of currently resolved theme
      const nextPref: AppThemePreference = this.isDark() ? 'light' : 'dark';
      this.setPreference(nextPref, true);
    } else if (currentPref === 'dark') {
      this.setPreference('light', true);
    } else {
      this.setPreference('auto', true);
    }
  }

  /**
   * Set specific preference ('auto', 'dark', 'light')
   */
  setPreference(pref: AppThemePreference, showToast = false): void {
    this._preference.set(pref);
    try {
      localStorage.setItem(THEME_PREF_STORAGE_KEY, pref);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    } catch {}

    this.applyThemeToDom(this.isDark());

    if (showToast) {
      if (pref === 'auto') {
        const detail = this._extensionPrefersDark()
          ? 'ตรวจจับจาก Browser Extension'
          : (this._systemPrefersDark() ? 'ตรวจจับจาก Windows (Dark Mode)' : 'ตรวจจับจาก Windows (Light Mode)');
        this.toastService.info(`เปลี่ยนเป็นโหมดอัตโนมัติ (${detail})`);
      } else if (pref === 'dark') {
        this.toastService.info('เปลี่ยนเป็นโหมดมืด (Dark Mode)');
      } else {
        this.toastService.info('เปลี่ยนเป็นโหมดสว่าง (Light Mode)');
      }
    }
  }

  /**
   * Reset preference back to 'auto' (follows Windows / extension)
   */
  resetToAuto(): void {
    this.setPreference('auto', true);
  }

  // Compatibility for existing code
  setTheme(theme: AppTheme): void {
    this.setPreference(theme);
  }

  private getInitialPreference(): AppThemePreference {
    try {
      const savedPref = localStorage.getItem(THEME_PREF_STORAGE_KEY) as AppThemePreference;
      if (savedPref === 'dark' || savedPref === 'light' || savedPref === 'auto') {
        return savedPref;
      }
    } catch {}
    // Default to 'auto' so Windows / Extension is detected automatically out of the box
    return 'auto';
  }

  private checkSystemPrefersDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  private checkExtensionDark(): boolean {
    if (typeof document === 'undefined') return false;
    try {
      const doc = document.documentElement;
      // 1. Dark Reader attributes
      if (doc.hasAttribute('data-darkreader-mode') || doc.getAttribute('data-darkreader-scheme') === 'dark') {
        return true;
      }
      // 2. Dark Reader meta / injected style
      if (document.querySelector('meta[name="darkreader"], style.darkreader, style[class*="darkreader"]')) {
        return true;
      }
      // 3. Night Eye or similar dark extensions
      if (doc.hasAttribute('data-nighteye') || doc.classList.contains('nighteye')) {
        return true;
      }
      if (doc.getAttribute('data-color-mode') === 'dark' || doc.getAttribute('data-theme-mode') === 'dark') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private initSystemThemeListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    try {
      this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      this._systemPrefersDark.set(this.mediaQueryList.matches);

      const listener = (e: MediaQueryListEvent) => {
        this._systemPrefersDark.set(e.matches);
        if (this._preference() === 'auto') {
          this.applyThemeToDom(this.isDark());
        }
      };

      if (this.mediaQueryList.addEventListener) {
        this.mediaQueryList.addEventListener('change', listener);
      } else if ((this.mediaQueryList as any).addListener) {
        (this.mediaQueryList as any).addListener(listener);
      }
    } catch (e) {
      console.warn('System theme listener not supported:', e);
    }
  }

  private initExtensionObserver(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    try {
      this.observer = new MutationObserver(() => {
        const isExtDark = this.checkExtensionDark();
        if (this._extensionPrefersDark() !== isExtDark) {
          this._extensionPrefersDark.set(isExtDark);
          if (this._preference() === 'auto') {
            this.applyThemeToDom(this.isDark());
          }
        }
      });

      this.observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          'data-darkreader-mode',
          'data-darkreader-scheme',
          'data-nighteye',
          'data-color-mode',
          'data-theme-mode',
          'class',
        ],
        childList: true,
      });
    } catch (e) {
      console.warn('Extension mutation observer error:', e);
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
