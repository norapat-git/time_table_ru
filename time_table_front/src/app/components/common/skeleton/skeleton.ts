import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card' | 'badge' | 'avatar';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper">
      @for (line of lineArray; track $index) {
        <div
          class="skeleton-item"
          [class.animated]="animated"
          [class]="'variant-' + variant"
          [style.width]="getLineWidth($index)"
          [style.height]="height"
          [style.borderRadius]="borderRadius || null"
        ></div>
      }
    </div>
  `,
  styleUrl: './skeleton.css',
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'text';
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
      return '65%'; // Last line shorter
    } else if (index % 2 === 1) {
      return '92%';
    }
    return this.width;
  }
}
