import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-course-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="skeleton-card-container">
      @for (item of countArray; track $index) {
        <div class="skeleton-course-card">
          <!-- Prefix badge skeleton -->
          <div class="skeleton-card-badge">
            <app-skeleton variant="rect" width="2.4rem" height="1.8rem" borderRadius="var(--radius-sm, 6px)" />
          </div>

          <!-- Course Code Skeleton -->
          <div class="skeleton-card-code">
            <app-skeleton variant="text" width="5.5rem" height="1.25rem" />
          </div>

          <!-- Title Lines Skeleton -->
          <div class="skeleton-card-titles">
            <app-skeleton variant="text" width="90%" height="1.1rem" />
            <app-skeleton variant="text" width="70%" height="0.85rem" />
          </div>

          <!-- Meta badges Skeleton -->
          <div class="skeleton-card-meta">
            <app-skeleton variant="badge" width="5.5rem" height="1.5rem" />
            <app-skeleton variant="badge" width="4.5rem" height="1.5rem" />
            <app-skeleton variant="badge" width="4.5rem" height="1.5rem" />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-card-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-4, 1rem);
      width: 100%;
    }

    .skeleton-course-card {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e1e5ef);
      border-radius: var(--radius-lg, 1rem);
      padding: var(--space-5, 1.25rem);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
      min-height: 180px;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(13, 33, 87, 0.08));
    }

    .skeleton-card-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }

    .skeleton-card-code {
      margin-bottom: 0.25rem;
    }

    .skeleton-card-titles {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .skeleton-card-meta {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `]
})
export class CourseCardSkeletonComponent {
  @Input() count: number = 6;

  get countArray(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, i) => i);
  }
}
