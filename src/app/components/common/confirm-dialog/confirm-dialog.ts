import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialogComponent {
  readonly dialogService = inject(ConfirmDialogService);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.dialogService.state().isOpen) {
      this.dialogService.handleCancel();
    }
  }

  @HostListener('window:keydown.enter')
  onEnter(): void {
    if (this.dialogService.state().isOpen) {
      this.dialogService.handleConfirm();
    }
  }
}
