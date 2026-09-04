import { Injectable, signal } from '@angular/core';

export type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastAction {
  label: string;
  onClick: (event: MouseEvent) => void;
}

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  id?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  description?: string;
  duration: number;
  timestamp: number;
  action?: ToastAction;
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  timerId?: any;
  remainingTime?: number;
  startTime?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly _toasts = signal<ToastItem[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'default', options?: ToastOptions): string {
    const id = options?.id || 'sonner_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const duration = options?.duration !== undefined ? options.duration : type === 'error' ? 5000 : 4000;

    const newToast: ToastItem = {
      id,
      type,
      title: options?.title,
      message,
      description: options?.description,
      duration,
      timestamp: Date.now(),
      action: options?.action,
      cancel: options?.cancel,
      startTime: Date.now(),
      remainingTime: duration,
    };

    if (type === 'loading') {
      this._toasts.update((list) => list.filter((t) => t.type !== 'loading'));
    }

    if (duration > 0) {
      newToast.timerId = setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    // Keep max 3-4 visible stacked toasts
    this._toasts.update((list) => [newToast, ...list.filter((t) => t.id !== id).slice(0, 3)]);
    return id;
  }

  success(message: string, optionsOrTitle?: ToastOptions | string): string {
    const opts = typeof optionsOrTitle === 'string' ? { title: optionsOrTitle } : optionsOrTitle;
    return this.show(message, 'success', opts);
  }

  error(message: string, optionsOrTitle?: ToastOptions | string): string {
    const opts = typeof optionsOrTitle === 'string' ? { title: optionsOrTitle } : optionsOrTitle;
    return this.show(message, 'error', opts);
  }

  info(message: string, optionsOrTitle?: ToastOptions | string): string {
    const opts = typeof optionsOrTitle === 'string' ? { title: optionsOrTitle } : optionsOrTitle;
    return this.show(message, 'info', opts);
  }

  warning(message: string, optionsOrTitle?: ToastOptions | string): string {
    const opts = typeof optionsOrTitle === 'string' ? { title: optionsOrTitle } : optionsOrTitle;
    return this.show(message, 'warning', opts);
  }

  loading(message: string = 'กำลังโหลด...', options?: ToastOptions): string {
    return this.show(message, 'loading', { ...options, duration: 0 });
  }

  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ): Promise<T> {
    const id = this.loading(msgs.loading);
    const p = typeof promise === 'function' ? promise() : promise;

    return p
      .then((data) => {
        const msg = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
        this.dismiss(id);
        this.success(msg);
        return data;
      })
      .catch((err) => {
        const msg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
        this.dismiss(id);
        this.error(msg);
        throw err;
      });
  }

  pause(id: string): void {
    const list = this._toasts();
    const target = list.find((t) => t.id === id);
    if (!target || target.duration === 0 || !target.timerId) return;

    clearTimeout(target.timerId);
    target.timerId = undefined;
    if (target.startTime && target.remainingTime !== undefined) {
      const elapsed = Date.now() - target.startTime;
      target.remainingTime = Math.max(1200, target.remainingTime - elapsed);
    }
  }

  resume(id: string): void {
    const list = this._toasts();
    const target = list.find((t) => t.id === id);
    if (!target || target.duration === 0 || target.timerId) return;

    const remaining = target.remainingTime && target.remainingTime > 1200 ? target.remainingTime : 2500;
    target.startTime = Date.now();
    target.remainingTime = remaining;
    target.timerId = setTimeout(() => {
      this.dismiss(id);
    }, remaining);
  }

  dismiss(id?: string): void {
    if (!id) {
      this.clearAll();
      return;
    }
    const target = this._toasts().find((t) => t.id === id);
    if (target?.timerId) {
      clearTimeout(target.timerId);
    }
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  dismissLoading(): void {
    this._toasts.update((list) => {
      list.filter((t) => t.type === 'loading').forEach((t) => {
        if (t.timerId) clearTimeout(t.timerId);
      });
      return list.filter((t) => t.type !== 'loading');
    });
  }

  clearAll(): void {
    this._toasts().forEach((t) => {
      if (t.timerId) clearTimeout(t.timerId);
    });
    this._toasts.set([]);
  }
}

// Global convenience function matching `import { toast } from "sonner"`
export const toast = (message: string, options?: ToastOptions) => {
  const service = (window as any).__ru_toast_service as ToastService;
  if (service) return service.show(message, 'default', options);
  return '';
};
toast.success = (message: string, options?: ToastOptions) => {
  const service = (window as any).__ru_toast_service as ToastService;
  return service ? service.success(message, options) : '';
};
toast.error = (message: string, options?: ToastOptions) => {
  const service = (window as any).__ru_toast_service as ToastService;
  return service ? service.error(message, options) : '';
};
toast.info = (message: string, options?: ToastOptions) => {
  const service = (window as any).__ru_toast_service as ToastService;
  return service ? service.info(message, options) : '';
};
toast.warning = (message: string, options?: ToastOptions) => {
  const service = (window as any).__ru_toast_service as ToastService;
  return service ? service.warning(message, options) : '';
};
toast.loading = (message: string, options?: ToastOptions) => {
  const service = (window as any).__ru_toast_service as ToastService;
  return service ? service.loading(message, options) : '';
};
toast.promise = <T>(promise: Promise<T> | (() => Promise<T>), msgs: any) => {
  const service = (window as any).__ru_toast_service as ToastService;
  return service ? service.promise(promise, msgs) : Promise.reject();
};
toast.dismiss = (id?: string) => {
  const service = (window as any).__ru_toast_service as ToastService;
  if (service) service.dismiss(id);
};
toast.dismissLoading = () => {
  const service = (window as any).__ru_toast_service as ToastService;
  if (service) service.dismissLoading();
};
