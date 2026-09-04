import { Component, inject, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingTourService } from '../../../services/onboarding-tour.service';

@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-tour.html',
  styleUrl: './onboarding-tour.css',
})
export class OnboardingTourComponent {
  readonly tourService = inject(OnboardingTourService);

  // Compute position of floating tooltip card relative to spotlight with Smart Flip & Anti-Overlap Guard
  readonly cardPositionStyle = computed(() => {
    const spot = this.tourService.spotlightRect();
    const step = this.tourService.currentStep();
    if (!spot || !step) {
      // Center fallback
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const preferredPos = step.position || 'bottom';
    const cardWidth = 360;
    const cardHeight = 230;
    const margin = 16;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Calculate available space in 4 directions around spotlight
    const spaceBelow = viewportH - (spot.top + spot.height) - margin;
    const spaceAbove = spot.top - margin;
    const spaceRight = viewportW - (spot.left + spot.width) - margin;
    const spaceLeft = spot.left - margin;

    // Smart Auto-Flip: If chosen position does not have enough clearance, flip to the opposite side
    let finalPos = preferredPos;
    if (preferredPos === 'bottom') {
      if (spaceBelow < cardHeight && spaceAbove >= cardHeight) {
        finalPos = 'top';
      } else if (spaceBelow < cardHeight && spaceAbove > spaceBelow) {
        finalPos = 'top';
      }
    } else if (preferredPos === 'top') {
      if (spaceAbove < cardHeight && spaceBelow >= cardHeight) {
        finalPos = 'bottom';
      } else if (spaceAbove < cardHeight && spaceBelow > spaceAbove) {
        finalPos = 'bottom';
      }
    } else if (preferredPos === 'right') {
      if (spaceRight < cardWidth && spaceLeft >= cardWidth) {
        finalPos = 'left';
      }
    } else if (preferredPos === 'left') {
      if (spaceLeft < cardWidth && spaceRight >= cardWidth) {
        finalPos = 'right';
      }
    }

    let top = 0;
    let left = 0;

    switch (finalPos) {
      case 'bottom':
        top = spot.top + spot.height + margin;
        left = spot.left + spot.width / 2 - cardWidth / 2;
        break;
      case 'top':
        top = spot.top - cardHeight - margin;
        left = spot.left + spot.width / 2 - cardWidth / 2;
        break;
      case 'left':
        top = spot.top + spot.height / 2 - cardHeight / 2;
        left = spot.left - cardWidth - margin;
        break;
      case 'right':
        top = spot.top + spot.height / 2 - cardHeight / 2;
        left = spot.left + spot.width + margin;
        break;
      default:
        top = spot.top + spot.height + margin;
        left = spot.left;
    }

    // Horizontal boundary constraints (keep at least 16px from viewport sides)
    if (left < 16) left = 16;
    if (left + cardWidth > viewportW - 16) left = viewportW - cardWidth - 16;

    // Anti-Overlap Vertical Guard: Strictly guarantee the card does not overlap the spotlight button
    if (finalPos === 'top') {
      // Bottom of card must stay above the spotlight target with at least 10px clearance
      if (top + cardHeight > spot.top - 10) {
        top = spot.top - cardHeight - 10;
      }
      if (top < 16) top = 16;
    } else if (finalPos === 'bottom') {
      // Top of card must stay below the spotlight target with at least 10px clearance
      if (top < spot.top + spot.height + 10) {
        top = spot.top + spot.height + 10;
      }
      if (top + cardHeight > viewportH - 16) {
        // If bottom overflows, check if top has more clearance
        if (spaceAbove > 180) {
          top = Math.max(16, spot.top - cardHeight - 10);
        } else {
          top = Math.max(16, viewportH - cardHeight - 16);
        }
      }
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  });

  // Re-calculate spotlight on resize
  @HostListener('window:resize')
  onResize(): void {
    const step = this.tourService.currentStep();
    if (step && step.targetSelector) {
      this.tourService.updateSpotlight(step.targetSelector);
    }
  }

  // Keyboard shortcut (Escape to skip, ArrowRight to next, ArrowLeft to prev)
  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.tourService.isActive()) return;

    if (event.key === 'Escape') {
      this.tourService.skipTour();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      this.tourService.nextStep();
    } else if (event.key === 'ArrowLeft') {
      this.tourService.prevStep();
    }
  }
}
