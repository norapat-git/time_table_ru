import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabNavComponent, TabItem } from './components/tab-nav/tab-nav';
import { LoginPageComponent } from './components/login-page/login-page';

// Group 1: จัดการข้อมูล
import { TabAcademicYearComponent } from './components/tab-academic-year/tab-academic-year';
import { TabCourseSearchComponent } from './components/tab-course-search/tab-course-search';
import { TabPairedCoursesComponent } from './components/tab-paired-courses/tab-paired-courses';
import { TabCurriculumComponent } from './components/tab-curriculum/tab-curriculum';
import { TabInstructorComponent } from './components/tab-instructor/tab-instructor';
import { TabTimetableManageComponent } from './components/tab-timetable-manage/tab-timetable-manage';

// Group 2: รายงาน
import { TabReportCompulsoryComponent } from './components/tab-report-compulsory/tab-report-compulsory';
import { TabReportFacultyYearComponent } from './components/tab-report-faculty-year/tab-report-faculty-year';
import { TabReportMr30Component } from './components/tab-report-mr30/tab-report-mr30';
import { TabStudentScheduleComponent } from './components/tab-student-schedule/tab-student-schedule';
import { TabReportOfferedCoursesComponent } from './components/tab-report-offered-courses/tab-report-offered-courses';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TabNavComponent,
    LoginPageComponent,
    TabAcademicYearComponent,
    TabCourseSearchComponent,
    TabPairedCoursesComponent,
    TabCurriculumComponent,
    TabInstructorComponent,
    TabTimetableManageComponent,
    TabReportCompulsoryComponent,
    TabReportFacultyYearComponent,
    TabReportMr30Component,
    TabStudentScheduleComponent,
    TabReportOfferedCoursesComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly authService = inject(AuthService);

  readonly activeTab = signal<string>('academic-year');

  readonly tabs: TabItem[] = [
    // 1. จัดการข้อมูล (Data Management)
    {
      id: 'academic-year',
      groupId: 'data-manage',
      groupName: '1. จัดการข้อมูล',
      label: 'จัดการปีภาค',
      icon: 'event_available',
    },
    {
      id: 'course-search',
      groupId: 'data-manage',
      groupName: '1. จัดการข้อมูล',
      label: 'จัดการวิชาที่เปิดสอน',
      icon: 'auto_stories',
    },
    {
      id: 'paired-courses',
      groupId: 'data-manage',
      groupName: '1. จัดการข้อมูล',
      label: 'จัดการวิชาคู่',
      icon: 'join_inner',
    },
    {
      id: 'curriculum',
      groupId: 'data-manage',
      groupName: '1. จัดการข้อมูล',
      label: 'จัดการหลักสูตร',
      icon: 'history_edu',
    },
    {
      id: 'instructor',
      groupId: 'data-manage',
      groupName: '1. จัดการข้อมูล',
      label: 'จัดการอาจารย์ผู้สอน',
      icon: 'person',
    },
    {
      id: 'timetable-manage',
      groupId: 'data-manage',
      groupName: '1. จัดการข้อมูล',
      label: 'จัดการตารางสอน',
      icon: 'calendar_month',
    },

    // 2. รายงาน (Reports)
    {
      id: 'report-compulsory',
      groupId: 'reports',
      groupName: '2. รายงาน',
      label: 'วิชาบังคับตามแผน',
      icon: 'fact_check',
    },
    {
      id: 'report-faculty-year',
      groupId: 'reports',
      groupName: '2. รายงาน',
      label: 'วิชาโปรแกรมแยกคณะ/ชั้นปี',
      icon: 'account_tree',
    },
    {
      id: 'report-mr30',
      groupId: 'reports',
      groupName: '2. รายงาน',
      label: 'รายงาน มร.30',
      icon: 'description',
    },
    {
      id: 'student-schedule',
      groupId: 'reports',
      groupName: '2. รายงาน',
      label: 'ตารางเรียน',
      icon: 'view_timeline',
    },
    {
      id: 'report-offered-courses',
      groupId: 'reports',
      groupName: '2. รายงาน',
      label: 'วิชาที่เปิดสอน',
      icon: 'format_list_bulleted',
    },
  ];

  setTab(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onLogout(): void {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      this.authService.logout();
    }
  }
}
