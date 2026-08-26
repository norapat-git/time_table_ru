import {
  Component,
  input,
  output,
  computed,
  inject,
  signal,
  ElementRef,
  viewChildren,
  viewChild,
  AfterViewInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export type TabGroupKey = 'data-manage' | 'reports';

export interface TabItem {
  id: string;
  groupId: TabGroupKey;
  groupName: string;
  label: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-tab-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-nav.html',
  styleUrl: './tab-nav.css',
})
export class TabNavComponent implements AfterViewInit {
  readonly authService = inject(AuthService);

  readonly tabs = input.required<TabItem[]>();
  readonly activeTab = input.required<string>();
  readonly tabChange = output<string>();

  readonly isMobileOpen = signal<boolean>(false);

  // References to container and tab buttons
  readonly navBodyRef = viewChild<ElementRef<HTMLElement>>('navBody');
  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('navBtn');

  // Apple-style Gliding Glass Capsule State
  readonly indicatorY = signal<number>(0);
  readonly indicatorHeight = signal<number>(42);
  readonly isInitialized = signal<boolean>(false);

  // Group 1: Data Management tabs
  readonly dataManageTabs = computed(() => {
    return this.tabs().filter((t) => t.groupId === 'data-manage');
  });

  // Group 2: Report tabs
  readonly reportTabs = computed(() => {
    return this.tabs().filter((t) => t.groupId === 'reports');
  });

  constructor() {
    // Whenever activeTab signal changes, glide to that tab smoothly
    effect(() => {
      const active = this.activeTab();
      this.glideToTab(active);
    });
  }

  ngAfterViewInit(): void {
    // Initial positioning
    setTimeout(() => {
      this.glideToTab(this.activeTab());
      this.isInitialized.set(true);
    }, 120);
  }

  glideToTab(tabId: string): void {
    const container = this.navBodyRef()?.nativeElement;
    const buttons = this.tabButtons();
    if (!container || !buttons || buttons.length === 0) return;

    const targetBtn = buttons.find((btn) => btn.nativeElement.dataset['tabId'] === tabId);
    if (targetBtn) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = targetBtn.nativeElement.getBoundingClientRect();

      const relativeTop = btnRect.top - containerRect.top + container.scrollTop;
      const height = btnRect.height;

      this.indicatorY.set(relativeTop);
      this.indicatorHeight.set(height);
    }
  }

  onTabClick(tabId: string): void {
    this.tabChange.emit(tabId);
    this.isMobileOpen.set(false);
    this.glideToTab(tabId);
  }

  toggleMobileSidebar(): void {
    this.isMobileOpen.set(!this.isMobileOpen());
  }

  onLogout(): void {
    this.authService.logout();
  }
}
