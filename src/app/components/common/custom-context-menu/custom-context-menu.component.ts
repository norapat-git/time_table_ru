import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ContextMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  iconType?: 'edit' | 'detail' | 'delete' | 'primary' | 'warning' | 'default';
  variant?: 'danger' | 'normal';
  dividerAfter?: boolean;
  disabled?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-custom-context-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
    <div class="card-context-menu-backdrop" (click)="onClose()" (contextmenu)="onClose(); $event.preventDefault()">
      <div
        class="vertical-glass-menu"
        [style.top.px]="computedPosition.y"
        [style.left.px]="computedPosition.x"
        (click)="$event.stopPropagation()"
      >
        <!-- Glass Header (if provided) -->
        @if (headerBadge || headerTitle) {
        <div class="glass-menu-header cascade-item" style="animation-delay: 0.02s;">
          @if (headerBadge) {
          <span class="glass-header-badge">{{ headerBadge }}</span>
          }
          @if (headerTitle) {
          <span class="glass-header-title" [title]="headerTitle">{{ headerTitle }}</span>
          }
        </div>
        <div class="glass-menu-divider cascade-item" style="animation-delay: 0.05s;"></div>
        }

        <!-- Menu Action Items -->
        @for (item of items; track item.id; let idx = $index) {
          @if (!item.disabled) {
          <button
            type="button"
            class="glass-menu-item cascade-item"
            [class.item-danger]="item.variant === 'danger'"
            [class.item-edit]="item.iconType === 'edit'"
            [class.item-detail]="item.iconType === 'detail'"
            [class.item-delete]="item.iconType === 'delete'"
            [class.item-primary]="item.iconType === 'primary'"
            [style.animation-delay.s]="0.06 + idx * 0.035"
            (click)="triggerItem(item)"
          >
            <div class="glass-item-icon-box" [ngClass]="'icon-' + (item.iconType || 'default')">
              <span class="material-symbols-rounded">{{ item.icon }}</span>
            </div>
            <div class="glass-item-text">
              <span class="glass-item-title">{{ item.label }}</span>
              @if (item.sublabel) {
              <span class="glass-item-desc">{{ item.sublabel }}</span>
              }
            </div>
            @if (item.variant !== 'danger') {
            <span class="material-symbols-rounded glass-item-arrow">chevron_right</span>
            }
          </button>

          @if (item.dividerAfter) {
          <div class="glass-menu-divider cascade-item" [style.animation-delay.s]="0.07 + idx * 0.035"></div>
          }
          }
        }
      </div>
    </div>
    }
  `,
  styleUrl: './custom-context-menu.component.css',
})
export class CustomContextMenuComponent {
  @Input() isOpen: boolean = false;
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };
  @Input() headerBadge?: string;
  @Input() headerTitle?: string;
  @Input() items: ContextMenuItem[] = [];
  @Input() menuWidth: number = 240;
  @Input() menuHeight: number = 220;

  @Output() close = new EventEmitter<void>();

  get computedPosition(): { x: number; y: number } {
    const width = this.menuWidth || 240;
    const height = this.menuHeight || 220;
    let x = this.position?.x ?? 0;
    let y = this.position?.y ?? 0;

    if (typeof window !== 'undefined') {
      if (x + width > window.innerWidth - 12) {
        x = Math.max(12, window.innerWidth - width - 12);
      }
      if (y + height > window.innerHeight - 12) {
        y = Math.max(12, window.innerHeight - height - 12);
      }
    }
    return { x, y };
  }

  triggerItem(item: ContextMenuItem): void {
    this.close.emit();
    if (item.action) {
      item.action();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}
