import { Injectable, signal, computed } from '@angular/core';

export interface TourStep {
  targetSelector?: string;
  title: string;
  description: string;
  icon?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  beforeShow?: () => Promise<void> | void;
  actionHint?: string;
}

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingTourService {
  private readonly STORAGE_KEY_PREFIX = 'ru_timetable_tour_';

  readonly isActive = signal<boolean>(false);
  readonly currentTourKey = signal<string>('');
  readonly steps = signal<TourStep[]>([]);
  readonly currentStepIndex = signal<number>(0);
  readonly spotlightRect = signal<SpotlightRect | null>(null);

  readonly currentStep = computed<TourStep | null>(() => {
    const s = this.steps();
    const idx = this.currentStepIndex();
    return s[idx] || null;
  });

  readonly totalSteps = computed<number>(() => this.steps().length);
  readonly isFirstStep = computed<boolean>(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed<boolean>(() => this.currentStepIndex() === this.steps().length - 1);

  // Check if tour already seen in LocalStorage
  isTourCompleted(tourKey: string): boolean {
    try {
      return localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${tourKey}`) === 'completed';
    } catch {
      return false;
    }
  }

  // Mark tour completed in LocalStorage
  private markTourCompleted(tourKey: string): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${tourKey}`, 'completed');
    } catch { }
  }

  private onTourFinishedCallback?: () => void;

  // Start Tour (Skip if already completed unless force = true)
  async startTour(tourKey: string, tourSteps: TourStep[], force: boolean = false, onFinished?: () => void): Promise<void> {
    if (!force && this.isTourCompleted(tourKey)) {
      return;
    }

    if (!tourSteps || tourSteps.length === 0) return;

    this.onTourFinishedCallback = onFinished;
    this.currentTourKey.set(tourKey);
    this.steps.set(tourSteps);
    this.currentStepIndex.set(0);
    this.isActive.set(true);

    await this.renderCurrentStep();
  }

  // Navigate to Next Step
  async nextStep(): Promise<void> {
    if (this.currentStepIndex() < this.steps().length - 1) {
      this.currentStepIndex.update((idx) => idx + 1);
      await this.renderCurrentStep();
    } else {
      this.completeTour();
    }
  }

  // Navigate to Previous Step
  async prevStep(): Promise<void> {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update((idx) => idx - 1);
      await this.renderCurrentStep();
    }
  }

  // Skip / Close Tour
  skipTour(): void {
    this.markTourCompleted(this.currentTourKey());
    this.cleanup();
  }

  // Complete Tour
  completeTour(): void {
    this.markTourCompleted(this.currentTourKey());
    this.cleanup();
  }

  // Reset tour in localStorage to allow testing again
  resetTour(tourKey: string): void {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${tourKey}`);
    } catch { }
  }

  private cleanup(): void {
    if (this.onTourFinishedCallback) {
      try {
        this.onTourFinishedCallback();
      } catch (e) {
        console.error('[OnboardingTour] onFinished callback error:', e);
      }
      this.onTourFinishedCallback = undefined;
    }
    this.isActive.set(false);
    this.spotlightRect.set(null);
    this.steps.set([]);
    this.currentStepIndex.set(0);
  }

  // Render Step with Async / DOM Handling
  private async renderCurrentStep(): Promise<void> {
    const step = this.currentStep();
    if (!step) return;

    // Handle beforeShow (e.g. opening modal, drawer, or preparing elements)
    if (step.beforeShow) {
      await step.beforeShow();
      // Allow DOM repaint
      await new Promise((r) => setTimeout(r, 120));
    }

    if (step.targetSelector) {
      this.updateSpotlight(step.targetSelector);
    } else {
      this.spotlightRect.set(null);
    }
  }

  // Find DOM element, scroll to center, and track bounding rect during scroll animation
  updateSpotlight(selector: string, retryCount: number = 0): void {
    const selectors = selector.split(',').map((s) => s.trim());
    let el: HTMLElement | null = null;

    for (const sel of selectors) {
      const found = document.querySelector(sel) as HTMLElement | null;
      if (found) {
        const rect = found.getBoundingClientRect();
        // Ignore collapsed/hidden elements with 0 width or height unless no other option
        if (rect.width > 20 && rect.height > 20) {
          el = found;
          break;
        } else if (!el) {
          el = found;
        }
      }
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 20 && retryCount < 4) {
        setTimeout(() => this.updateSpotlight(selector, retryCount + 1), 80);
        return;
      }

      // Smoothly scroll element into view (center of scroll container / viewport)
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      // Animate/track spotlight position while scrolling completes (400ms)
      const startTime = performance.now();
      const duration = 400;

      const trackSpotlight = () => {
        if (!this.isActive() || !el) return;
        const r = el.getBoundingClientRect();
        const padding = 6;

        this.spotlightRect.set({
          top: Math.max(0, r.top - padding),
          left: Math.max(0, r.left - padding),
          width: r.width + padding * 2,
          height: r.height + padding * 2,
          radius: 10,
        });

        if (performance.now() - startTime < duration) {
          requestAnimationFrame(trackSpotlight);
        }
      };

      requestAnimationFrame(trackSpotlight);
    } else if (retryCount < 4) {
      setTimeout(() => this.updateSpotlight(selector, retryCount + 1), 60);
    } else {
      this.spotlightRect.set(null);
    }
  }
}
