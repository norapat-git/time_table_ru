import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabNavComponent, TabItem } from './components/tab-nav/tab-nav';
import { TabCourseSearchComponent } from './components/tab-course-search/tab-course-search';
import { TabInstructorComponent } from './components/tab-instructor/tab-instructor';
import { TabThreeComponent } from './components/tab-three/tab-three';
import { TabFourComponent } from './components/tab-four/tab-four';
import { TabFiveComponent } from './components/tab-five/tab-five';
import { TabSixComponent } from './components/tab-six/tab-six';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TabNavComponent,
    TabCourseSearchComponent,
    TabInstructorComponent,
    TabThreeComponent,
    TabFourComponent,
    TabFiveComponent,
    TabSixComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly activeTab = signal<number>(1);

  readonly tabs: TabItem[] = [
    { id: 1, label: 'ค้นหารายวิชา',      icon: 'auto_stories' },
    { id: 2, label: 'อาจารย์ผู้สอน',     icon: 'person' },
    { id: 3, label: 'Tab 3',              icon: 'calendar_month' },
    { id: 4, label: 'Tab 4',              icon: 'apartment' },
    { id: 5, label: 'Tab 5',              icon: 'bar_chart' },
    { id: 6, label: 'Tab 6',              icon: 'settings' },
  ];

  setTab(id: number): void {
    this.activeTab.set(id);
  }
}
