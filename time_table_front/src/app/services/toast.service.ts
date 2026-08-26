import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, or 0 for persistent/loading
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  // Show a generic toast
  show(type: ToastType, message: string, title?: string, duration: number = 3500): string {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now(),
    };

    // If loading, remove other loadings first
    if (type === 'loading') {
      this._toasts.update((list) => list.filter((t) => t.type !== 'loading'));
    }

    this._toasts.update((list) => [newToast, ...list.slice(0, 3)]); // Keep max 4 toasts

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title: string = 'สำเร็จ'): string {
    return this.show('success', message, title, 3500);
  }

  error(message: string, title: string = 'เกิดข้อผิดพลาด'): string {
    return this.show('error', message, title, 4500);
  }

  info(message: string, title: string = 'แจ้งเตือน'): string {
    return this.show('info', message, title, 3500);
  }

  warning(message: string, title: string = 'คำเตือน'): string {
    return this.show('warning', message, title, 4000);
  }

  loading(message: string = 'กำลังดำเนินการ...', title?: string): string {
    return this.show('loading', message, title, 0);
  }

  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  dismissLoading(): void {
    this._toasts.update((list) => list.filter((t) => t.type !== 'loading'));
  }

  clearAll(): void {
    this._toasts.set([]);
  }
}
