import { Injectable, signal } from '@angular/core';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: string;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  readonly state = signal<ConfirmDialogState>({
    isOpen: false,
    message: '',
    variant: 'danger',
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
  });

  confirm(options: ConfirmDialogOptions | string): Promise<boolean> {
    const opts: ConfirmDialogOptions =
      typeof options === 'string'
        ? { message: options, title: 'ยืนยันการทำรายการ', variant: 'danger' }
        : options;

    return new Promise<boolean>((resolve) => {
      this.state.set({
        isOpen: true,
        title: opts.title || (opts.variant === 'danger' ? 'ยืนยันการลบข้อมูล' : 'ยืนยันการทำรายการ'),
        message: opts.message,
        detail: opts.detail,
        confirmText: opts.confirmText || (opts.variant === 'danger' ? 'ลบข้อมูล' : 'ยืนยัน'),
        cancelText: opts.cancelText || 'ยกเลิก',
        variant: opts.variant || 'danger',
        icon: opts.icon || (opts.variant === 'danger' ? 'delete_forever' : opts.variant === 'warning' ? 'warning' : 'help'),
        resolve,
      });
    });
  }

  handleConfirm(): void {
    const s = this.state();
    if (s.resolve) s.resolve(true);
    this.close();
  }

  handleCancel(): void {
    const s = this.state();
    if (s.resolve) s.resolve(false);
    this.close();
  }

  private close(): void {
    this.state.update((s) => ({ ...s, isOpen: false, resolve: undefined }));
  }
}
