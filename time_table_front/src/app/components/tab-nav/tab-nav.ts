import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  id: number;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-tab-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-nav.html',
  styleUrl: './tab-nav.css',
})
export class TabNavComponent {
  readonly tabs = input.required<TabItem[]>();
  readonly activeTab = input.required<number>();
  readonly tabChange = output<number>();

  onTabClick(tabId: number): void {
    this.tabChange.emit(tabId);
  }
}
