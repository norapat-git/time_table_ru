import { Component, inject, signal, computed } from '@angular/core';
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
import { ToastContainerComponent } from './components/common/toast-container/toast-container';
import { OnboardingTourComponent } from './components/common/onboarding-tour/onboarding-tour';
import { OnboardingTourService, TourStep } from './services/onboarding-tour.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TabNavComponent,
    LoginPageComponent,
    ToastContainerComponent,
    OnboardingTourComponent,
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
  readonly tourService = inject(OnboardingTourService);

  readonly activeTab = signal<string>('academic-year');

  readonly tabs: TabItem[] = [
    // 1. จัดการข้อมูล (Data Management)
    {
      id: 'academic-year',
      groupId: 'data-manage',
      groupName: 'จัดการข้อมูล',
      label: 'จัดการปีภาค',
      icon: 'event_available',
    },
    {
      id: 'course-search',
      groupId: 'data-manage',
      groupName: 'จัดการข้อมูล',
      label: 'จัดการวิชาที่เปิดสอน',
      icon: 'auto_stories',
    },
    {
      id: 'paired-courses',
      groupId: 'data-manage',
      groupName: 'จัดการข้อมูล',
      label: 'จัดการวิชาคู่',
      icon: 'join_inner',
    },
    {
      id: 'curriculum',
      groupId: 'data-manage',
      groupName: 'จัดการข้อมูล',
      label: 'จัดการหลักสูตร',
      icon: 'history_edu',
    },
    {
      id: 'instructor',
      groupId: 'data-manage',
      groupName: 'จัดการข้อมูล',
      label: 'จัดการอาจารย์ผู้สอน',
      icon: 'person',
    },
    {
      id: 'timetable-manage',
      groupId: 'data-manage',
      groupName: 'จัดการข้อมูล',
      label: 'จัดการตารางสอน',
      icon: 'calendar_month',
    },

    // 2. รายงาน (Reports)
    {
      id: 'report-compulsory',
      groupId: 'reports',
      groupName: 'รายงาน',
      label: 'วิชาบังคับตามแผน',
      icon: 'fact_check',
    },
    {
      id: 'report-faculty-year',
      groupId: 'reports',
      groupName: 'รายงาน',
      label: 'วิชาโปรแกรมแยกคณะ/ชั้นปี',
      icon: 'account_tree',
    },
    {
      id: 'report-mr30',
      groupId: 'reports',
      groupName: 'รายงาน',
      label: 'รายงาน มร.30',
      icon: 'description',
    },
    {
      id: 'student-schedule',
      groupId: 'reports',
      groupName: 'รายงาน',
      label: 'ตารางเรียน',
      icon: 'view_timeline',
    },
    {
      id: 'report-offered-courses',
      groupId: 'reports',
      groupName: 'รายงาน',
      label: 'วิชาที่เปิดสอน',
      icon: 'format_list_bulleted',
    },
  ];

  readonly currentTabItem = computed(() => {
    const id = this.activeTab();
    return this.tabs.find((t) => t.id === id) || this.tabs[0];
  });

  setTab(tabId: string): void {
    this.activeTab.set(tabId);
  }

  // Trigger Tour for current active tab
  startCurrentTabTour(force: boolean = true): void {
    const tab = this.activeTab();

    if (tab === 'paired-courses') {
      const steps: TourStep[] = [
        {
          targetSelector: '.action-right-btns .btn-add-primary, .btn-add-primary',
          title: 'ปุ่มเพิ่มกลุ่มวิชาคู่',
          description: 'คลิกปุ่มนี้เมื่อต้องการสร้างกลุ่มวิชาเทียบเท่า (วิชาเดียวกันที่มีการปรับรหัสหรือชื่อตามช่วงปีหลักสูตร) โดยสามารถเลือกค้นหาจากหมวดตัวอักษรด้านข้างขวาได้',
          icon: 'add_circle',
          position: 'bottom',
          actionHint: 'สามารถเพิ่มวิชาคู่ได้ตั้งแต่ 2 วิชาขึ้นไป',
        },
        {
          targetSelector: '.action-bar .search-box, .search-box',
          title: 'กล่องค้นหากลุ่มวิชา',
          description: 'พิมพ์รหัสวิชา เช่น ACC1101 หรือหมายเลขกลุ่ม เพื่อค้นหากลุ่มวิชาคู่ที่ต้องการได้อย่างรวดเร็ว',
          icon: 'search',
          position: 'bottom',
        },
        {
          targetSelector: '.data-table, .table-responsive',
          title: 'ตารางแสดงความสัมพันธ์วิชาคู่',
          description: 'แสดงรายการวิชาที่จับคู่เทียบเท่ากัน พร้อมช่วงปีหลักสูตร (เช่น ปี 65-68), ชั้นปี และภาคการศึกษา',
          icon: 'sync_alt',
          position: 'top',
        },
        {
          targetSelector: '.col-actions, .btn-delete',
          title: 'การลบและจัดเก็บประวัติ (HIS)',
          description: 'เมื่อกดลบกลุ่มวิชาคู่ ระบบจะสำรองประวัติทุกวิชาลงในตาราง HIS ก่อนลบออกจากระบบเสมอ ปลอดภัย 100%',
          icon: 'history_edu',
          position: 'left',
        },
      ];
      this.tourService.startTour('paired-courses', steps, force);
    } else if (tab === 'course-search') {
      const steps: TourStep[] = [
        {
          targetSelector: '.sem-selector-container, .select-trigger-btn',
          title: 'เลือกปีและภาคการศึกษา',
          description: 'คลิกเพื่อเลือกดูและจัดการรายวิชาที่เปิดสอนตามปีและภาคการศึกษาที่ต้องการ',
          icon: 'event_available',
          position: 'bottom',
        },
        {
          targetSelector: '.action-right-btns .btn-add-primary, .btn-add-primary',
          title: 'เพิ่มวิชาที่เปิดสอน',
          description: 'คลิกเพื่อเปิดหน้าต่างเลือกวิชา โดยสามารถเลือกตัวอักษรนำหน้า (A, B, C...) และเลือกหลายวิชาพร้อมกันได้',
          icon: 'library_add',
          position: 'bottom',
        },
        {
          targetSelector: '.action-bar .search-box, .search-box',
          title: 'ค้นหารายวิชาในตาราง',
          description: 'ค้นหาด้วยรหัสวิชา ชื่อวิชา หรือหมายเหตุ',
          icon: 'search',
          position: 'bottom',
        },
        {
          targetSelector: '.data-table, .table-responsive',
          title: 'ตารางรายวิชาที่เปิดสอน',
          description: 'แสดงรายการวิชาที่เปิดสอน สามารถติ๊กเลือกหลายวิชาพร้อมกันเพื่อทำการลบแบบกลุ่มได้',
          icon: 'table_chart',
          position: 'top',
        },
      ];
      this.tourService.startTour('course-search', steps, force);
    } else if (tab === 'curriculum') {
      const steps: TourStep[] = [
        {
          targetSelector: '.btn-add-primary',
          title: 'เพิ่ม/จัดการวิชาในหลักสูตร',
          description: 'คลิกเพื่อเปิดหน้าต่างกำหนดรายวิชาตามแผนการเรียน คณะ สาขาวิชา ชั้นปี และภาคการศึกษา',
          icon: 'menu_book',
          position: 'bottom',
        },
        {
          targetSelector: '.filter-toolbar',
          title: 'แถบตัวกรองข้อมูลแบบเลือกคณะ/สาขา',
          description: 'สามารถเลือกกรองตาม คณะ, กลุ่มสาขาวิชา, ชั้นปี (1-6) และภาคเรียน (1-2) ได้สะดวกรวดเร็ว',
          icon: 'filter_alt',
          position: 'bottom',
        },
        {
          targetSelector: '.data-table, .table-responsive',
          title: 'ตารางรายวิชาในหลักสูตร',
          description: 'แสดงรายวิชาในหลักสูตร พร้อมข้อมูลหน่วยกิต คณะ และกลุ่มสาขา สามารถเลือกติ๊กลบหลายวิชาพร้อมกันได้',
          icon: 'table_view',
          position: 'top',
        },
      ];
      this.tourService.startTour('curriculum', steps, force);
    } else if (tab === 'academic-year') {
      const steps: TourStep[] = [
        {
          targetSelector: '.action-right-btns .btn-add-primary, .btn-add-primary',
          title: 'เพิ่มปีและภาคการศึกษา',
          description: 'เพิ่มปีการศึกษา (ตั้งแต่ปี 2550 ขึ้นไป) และเลือกภาคเรียน (ภาค 1 หรือ ภาค 2)',
          icon: 'calendar_add_on',
          position: 'bottom',
        },
        {
          targetSelector: '.action-bar .search-box, .search-box',
          title: 'ค้นหาปีภาค',
          description: 'พิมพ์ค้นหาปีการศึกษาหรือภาคเรียน',
          icon: 'search',
          position: 'bottom',
        },
        {
          targetSelector: '.data-table, .table-responsive',
          title: 'ตารางปีภาคและการตั้งค่าปัจจุบัน',
          description: 'สามารถคลิกเปิด/ปิดสถานะ "ปีภาคปัจจุบัน" เพื่อให้ระบบใช้เป็นค่าเริ่มต้นในการจัดตารางสอน',
          icon: 'toggle_on',
          position: 'top',
        },
      ];
      this.tourService.startTour('academic-year', steps, force);
    } else if (tab === 'instructor') {
      const steps: TourStep[] = [
        {
          targetSelector: '.action-bar-right .btn-primary, .btn-primary',
          title: 'เพิ่มอาจารย์ผู้สอน',
          description: 'คลิกเพื่อเปิดหน้าต่างค้นหาและเลือกอาจารย์จากฐานข้อมูล UGB_INSTRUCTOR เพื่อเพิ่มเข้าสู่ภาคการศึกษานี้',
          icon: 'person_add',
          position: 'bottom',
        },
        {
          targetSelector: '.action-bar-left .search-box, .search-box',
          title: 'ค้นหาอาจารย์ในตาราง',
          description: 'ค้นหาด้วยรหัสอาจารย์, ชื่อ-นามสกุล, ตำแหน่งทางวิชาการ หรือชื่อคณะ',
          icon: 'search',
          position: 'bottom',
        },
        {
          targetSelector: '.filter-select-wrapper',
          title: 'ตัวกรองคณะ',
          description: 'เลือกกรองเฉพาะอาจารย์ในคณะที่ต้องการตรวจสอบ',
          icon: 'account_balance',
          position: 'bottom',
        },
        {
          targetSelector: '.data-table, .table-responsive',
          title: 'ตารางรายชื่ออาจารย์ผู้สอน',
          description: 'แสดงข้อมูลอาจารย์พร้อมตำแหน่งทางวิชาการ คณะ และประเภทอาจารย์ สามารถเลือกติ๊กลบหลายท่านพร้อมกันได้',
          icon: 'badge',
          position: 'top',
        },
      ];
      this.tourService.startTour('instructor', steps, force);
    }
  }
}
