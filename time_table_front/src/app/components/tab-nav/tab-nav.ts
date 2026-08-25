import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TabGroupKey = 'data-manage' | 'reports';

export interface TabItem {
  id: string;
  groupId: TabGroupKey;
  groupName: string;
  label: string;
  icon: string;
  badge?: string;
}

export interface TabGroup {
  id: TabGroupKey;
  name: string;
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
  readonly activeTab = input.required<string>();
  readonly tabChange = output<string>();

  readonly groups: TabGroup[] = [
    { id: 'data-manage', name: '1. จัดการข้อมูล', icon: 'database' },
    { id: 'reports',     name: '2. รายงาน',       icon: 'monitoring' },
  ];

  readonly activeGroupId = computed<TabGroupKey>(() => {
    const currentId = this.activeTab();
    const found = this.tabs().find(t => t.id === currentId);
    return found ? (found.groupId as TabGroupKey) : 'data-manage';
  });

  readonly currentGroupTabs = computed(() => {
    const groupId = this.activeGroupId();
    return this.tabs().filter(t => t.groupId === groupId);
  });

  selectGroup(groupId: TabGroupKey): void {
    const firstTabOfGroup = this.tabs().find(t => t.groupId === groupId);
    if (firstTabOfGroup) {
      this.tabChange.emit(firstTabOfGroup.id);
    }
  }

  onTabClick(tabId: string): void {
    this.tabChange.emit(tabId);
  }
}
