import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skeleton, SkeletonModule } from 'primeng/skeleton';

export type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card' | 'badge' | 'avatar';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule, Skeleton, SkeletonModule],
  template: `
    <div class="skeleton-wrapper">
      @for (line of lineArray; track $index) {
        <p-skeleton
          [shape]="variant === 'circle' || variant === 'avatar' ? 'circle' : 'rectangle'"
          [width]="getLineWidth($index)"
          [height]="height"
          [borderRadius]="borderRadius || (variant === 'circle' || variant === 'avatar' ? '50%' : '8px')"
          [animation]="animated ? 'wave' : 'none'"
          styleClass="apple-p-skeleton"
        />
      }
    </div>
  `,
  styleUrl: './skeleton.css',
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'rect';
  @Input() width: string = '100%';
  @Input() height: string = '1rem';
  @Input() lines: number = 1;
  @Input() borderRadius: string = '';
  @Input() animated: boolean = true;

  get lineArray(): number[] {
    return Array.from({ length: Math.max(1, this.lines) }, (_, i) => i);
  }

  getLineWidth(index: number): string {
    if (this.lines <= 1) {
      return this.width;
    }
    // Stagger multiline paragraph widths for realistic skeleton feel
    if (index === this.lines - 1) {
      return '65%';
    } else if (index % 2 === 1) {
      return '92%';
    }
    return this.width;
  }
}
