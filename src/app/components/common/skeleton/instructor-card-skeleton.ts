import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton';

@Component({
  selector: 'app-instructor-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="skeleton-instructor-grid">
      @for (item of countArray; track $index) {
        <div class="skeleton-instructor-card">
          <!-- Avatar Skeleton -->
          <div class="avatar-wrap">
            <app-skeleton variant="circle" width="56px" height="56px" />
          </div>

          <!-- Info Skeleton -->
          <div class="info-wrap">
            <app-skeleton variant="text" width="60%" height="1.25rem" />
            <app-skeleton variant="text" width="80%" height="0.9rem" />
            <app-skeleton variant="text" width="45%" height="0.85rem" />
          </div>

          <!-- Tags Skeleton -->
          <div class="tags-wrap">
            <app-skeleton variant="badge" width="80px" height="1.4rem" />
            <app-skeleton variant="badge" width="95px" height="1.4rem" />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-instructor-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-4, 1rem);
      width: 100%;
    }

    .skeleton-instructor-card {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e1e5ef);
      border-radius: var(--radius-lg, 1rem);
      padding: var(--space-5, 1.25rem);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(13, 33, 87, 0.08));
    }

    .avatar-wrap {
      display: flex;
      align-items: center;
    }

    .info-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tags-wrap {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `]
})
export class InstructorCardSkeletonComponent {
  @Input() count: number = 4;

  get countArray(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, i) => i);
  }
}
