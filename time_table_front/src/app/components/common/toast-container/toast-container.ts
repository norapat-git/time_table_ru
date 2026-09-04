import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainerComponent implements OnInit {
  readonly toastService = inject(ToastService);
  readonly isExpanded = signal<boolean>(false);

  ngOnInit(): void {
    // Expose service for global `toast.success(...)` helper if needed
    (window as any).__ru_toast_service = this.toastService;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'loading':
        return 'sync';
      default:
        return 'notifications';
    }
  }

  onDismiss(toast: ToastItem, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.toastService.dismiss(toast.id);
  }

  onAction(toast: ToastItem, event: MouseEvent): void {
    event.stopPropagation();
    if (toast.action?.onClick) {
      toast.action.onClick(event);
    }
    this.toastService.dismiss(toast.id);
  }

  onCancel(toast: ToastItem, event: MouseEvent): void {
    event.stopPropagation();
    if (toast.cancel?.onClick) {
      toast.cancel.onClick();
    }
    this.toastService.dismiss(toast.id);
  }

  onMouseEnter(toast: ToastItem): void {
    this.toastService.pause(toast.id);
  }

  onMouseLeave(toast: ToastItem): void {
    this.toastService.resume(toast.id);
  }
}
