import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabNavComponent, TabItem } from './components/tab-nav/tab-nav';
import { LoginPageComponent } from './components/login-page/login-page';

// Group 1: ข้อมูลตั้งต้น (Setup)
import { TabAcademicYearComponent } from './components/setup/tab-academic-year/tab-academic-year';
import { TabCurriculumComponent } from './components/setup/tab-curriculum/tab-curriculum';
import { TabInstructorComponent } from './components/setup/tab-instructor/tab-instructor';

// Group 2: จัดการรายวิชา (Courses)
import { TabCourseSearchComponent } from './components/courses/tab-course-search/tab-course-search';
import { TabPairedCoursesComponent } from './components/courses/tab-paired-courses/tab-paired-courses';

// Group 3: ตารางสอน (Timetable)
import { TabStudentScheduleComponent } from './components/timetable/tab-student-schedule/tab-student-schedule';

// Group 4: รายงาน (Reports)
import { TabReportCompulsoryComponent } from './components/reports/tab-report-compulsory/tab-report-compulsory';
import { TabReportFacultyYearComponent } from './components/reports/tab-report-faculty-year/tab-report-faculty-year';
import { TabReportMr30Component } from './components/reports/tab-report-mr30/tab-report-mr30';
import { TabReportOfferedCoursesComponent } from './components/reports/tab-report-offered-courses/tab-report-offered-courses';

import { AuthService } from './services/auth.service';
import { ToastContainerComponent } from './components/common/toast-container/toast-container';
import { OnboardingTourComponent } from './components/common/onboarding-tour/onboarding-tour';
import { ConfirmDialogComponent } from './components/common/confirm-dialog/confirm-dialog';
import { OnboardingTourService, TourStep } from './services/onboarding-tour.service';

import { TabLockService } from './services/tab-lock.service';
import { ToastService } from './services/toast.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TabNavComponent,
    LoginPageComponent,
    ToastContainerComponent,
    OnboardingTourComponent,
    ConfirmDialogComponent,
    TabAcademicYearComponent,
    TabCourseSearchComponent,
    TabPairedCoursesComponent,
    TabCurriculumComponent,
    TabInstructorComponent,
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
  readonly tabLockService = inject(TabLockService);
  readonly toastService = inject(ToastService);
  readonly themeService = inject(ThemeService);

  readonly activeTab = signal<string>('academic-year');

  /**
   * Browser Reload / Window Close Guard:
   * Prompts user before leaving if drag-and-drop or draft moves are pending.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.tabLockService.isLocked()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Global Wheel Event Listener to prevent background page scroll
   * when any modal, dialog, or drawer is active.
   */
  @HostListener('window:wheel', ['$event'])
  onGlobalWheel(event: WheelEvent): void {
    const activeBackdrop = document.querySelector(
      '.modal-backdrop, .dialog-backdrop, .drawer-backdrop, .custom-modal-overlay'
    );
    if (!activeBackdrop) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // 1. If cursor is directly on backdrop/overlay (outside modal card): prevent background scroll
    if (
      target.classList.contains('modal-backdrop') ||
      target.classList.contains('dialog-backdrop') ||
      target.classList.contains('drawer-backdrop') ||
      target.classList.contains('custom-modal-overlay')
    ) {
      event.preventDefault();
      return;
    }

    // 2. If cursor is inside a modal, find the nearest scrollable body
    const scrollableAncestor = target.closest(
      '.modal-body, .modal-form-scrollable, .modal-recommend-body, .instructor-list-scroll, .avail-slots-scroll, .drawer-scroll-body, .custom-modal-body'
    ) as HTMLElement | null;

    if (!scrollableAncestor) {
      // Cursor is over unscrollable modal parts (modal header, modal footer, or static cards like clone modal)
      // Prevent wheel event so background doesn't scroll!
      event.preventDefault();
      return;
    }

    // 3. If container fits completely without overflow: prevent background scroll
    if (scrollableAncestor.scrollHeight <= scrollableAncestor.clientHeight) {
      event.preventDefault();
      return;
    }

    // 4. If container is scrollable, prevent scroll chaining at upper and lower boundaries
    const isScrollingUp = event.deltaY < 0;
    const isScrollingDown = event.deltaY > 0;

    if (isScrollingUp && scrollableAncestor.scrollTop <= 0) {
      event.preventDefault();
    } else if (
      isScrollingDown &&
      scrollableAncestor.scrollTop + scrollableAncestor.clientHeight >= scrollableAncestor.scrollHeight - 1
    ) {
      event.preventDefault();
    }
  }

  readonly tabs: TabItem[] = [
    // 1. ข้อมูลตั้งต้น (Setup / Prerequisites)
    {
      id: 'academic-year',
      groupId: 'setup',
      groupName: 'ข้อมูลตั้งต้น',
      label: 'ปีการศึกษา / ภาคเรียน',
      icon: 'event_available',
    },
    {
      id: 'curriculum',
      groupId: 'setup',
      groupName: 'ข้อมูลตั้งต้น',
      label: 'หลักสูตร',
      icon: 'history_edu',
    },
    {
      id: 'instructor',
      groupId: 'setup',
      groupName: 'ข้อมูลตั้งต้น',
      label: 'อาจารย์ผู้สอน',
      icon: 'person',
    },

    // 2. จัดการรายวิชา (Courses Management)
    {
      id: 'course-search',
      groupId: 'courses',
      groupName: 'จัดการรายวิชา',
      label: 'รายวิชาที่เปิดสอน',
      icon: 'auto_stories',
    },
    {
      id: 'paired-courses',
      groupId: 'courses',
      groupName: 'จัดการรายวิชา',
      label: 'วิชาคู่ / วิชาเทียบ',
      icon: 'join_inner',
    },

    // 3. ตารางสอน (Timetable)
    {
      id: 'student-schedule',
      groupId: 'timetable',
      groupName: 'ตารางสอน',
      label: 'จัดตารางสอน (ตามห้องเรียน)',
      icon: 'calendar_month',
    },

    // 4. รายงาน (Reports)
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
    if (this.activeTab() === tabId) return;

    if (this.tabLockService.isLocked()) {
      this.toastService.warning(
        this.tabLockService.lockReason() ||
        'ไม่สามารถเปลี่ยนแท็บได้ในขณะนี้ เนื่องจากกำลังเปิดโหมดปรับตาราง (Drag & Drop) อยู่'
      );
      return;
    }

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
    } else if (tab === 'timetable-manage') {
      const steps: TourStep[] = [
        {
          targetSelector: '.action-bar-right .btn-primary, .btn-primary',
          title: 'เพิ่มข้อมูลตารางสอน',
          description: 'คลิกเพื่อเปิดหน้าต่างจัดตารางสอน เลือกกระบวนวิชา (มีระบบเลือก A-Z) วัน-เวลาเรียน ห้องเรียน และอาจารย์ผู้สอน พร้อมระบบแนะนำคาบเรียนจาก มร.30',
          icon: 'add_circle',
          position: 'bottom',
        },
        {
          targetSelector: '.day-filter-bar',
          title: 'ตัวกรองวันเรียนด่วน',
          description: 'คลิกเลือกดูตารางสอนเฉพาะวัน เช่น วันจันทร์ วันอังคาร หรือดูทุกวันได้อย่างสะดวก',
          icon: 'calendar_view_week',
          position: 'bottom',
        },
        {
          targetSelector: '.action-bar-left .search-box, .search-box',
          title: 'ค้นหาตารางสอน',
          description: 'ค้นหาด้วยรหัสวิชา, ชื่อวิชา, ห้องเรียน หรือชื่ออาจารย์ผู้สอน',
          icon: 'search',
          position: 'bottom',
        },
        {
          targetSelector: '.data-table, .table-responsive',
          title: 'ตารางจัดการคาบสอน',
          description: 'แสดงรายละเอียดวัน เวลา รหัสวิชา ห้องเรียน และรายชื่ออาจารย์ผู้สอนในแต่ละคาบ สามารถติ๊กเลือกหลายวิชาเพื่อทำการลบแบบกลุ่มได้',
          icon: 'table_view',
          position: 'top',
        },
      ];
      this.tourService.startTour('timetable-manage', steps, force);
    } else if (tab === 'student-schedule') {
      const steps: TourStep[] = [
        {
          targetSelector: '.filter-card',
          title: 'เลือกปีการศึกษา และห้องเรียน',
          description: 'เลือกปี/ภาคการศึกษา และค้นหาห้องเรียนจากข้อมูลที่จัดตารางไว้ (RG_SCHEDULE_CLASS) หรือคลิกเลือกห้องที่เพิ่มล่าสุดด้านล่างได้อย่างรวดเร็ว',
          icon: 'meeting_room',
          position: 'bottom',
        },
        {
          targetSelector: '.btn-add-timetable-class, .filter-actions-group .btn-primary',
          title: 'ปุ่มเพิ่มตารางสอน (+)',
          description: 'คลิกปุ่ม (+) เพื่อเปิดหน้าต่างเพิ่มข้อมูลตารางสอนใหม่ โดยสามารถเลือกกระบวนวิชา วัน คาบเวลา ห้องเรียน และอาจารย์ผู้สอน หรือคลิกที่ช่องว่างในตารางโดยตรงได้เช่นกัน',
          icon: 'add_circle',
          position: 'bottom',
        },
        {
          targetSelector: '.grid-control-right .btn-action-edit-mode, .btn-action-edit-mode',
          title: 'โหมดปรับเปลี่ยนตารางสอน (Drag & Drop)',
          description: 'คลิกปุ่มนี้เพื่อเปิดโหมดปรับตาราง ท่านจะสามารถคลิกค้างแล้วลากกล่องวิชาไปวางในวันหรือเวลาอื่นได้อย่างอิสระ จากนั้นกดปุ่มบันทึกการเปลี่ยนแปลง',
          icon: 'drag_indicator',
          position: 'bottom',
        },
        {
          targetSelector: '.schedule-matrix-container, .matrix-table-wrapper',
          title: 'ตารางเมทริกซ์การใช้ห้องเรียน',
          description: 'แสดงตารางสอนแบ่งตามวัน (จันทร์-อาทิตย์) และเวลาเรียน สามารถคลิกที่กล่องวิชาเพื่อเปิดดูรายละเอียดวิชาและรายชื่ออาจารย์ผู้สอนได้',
          icon: 'calendar_view_week',
          position: 'top',
        },
        {
          targetSelector: '.header-actions .btn-action-primary, .header-actions',
          title: 'ส่งออกไฟล์ CSV และพิมพ์ตารางเรียน',
          description: 'สามารถกดพิมพ์ตารางเรียนแบบจัดหน้ากระดาษสวยงาม หรือส่งออกข้อมูลตารางเรียนของห้องนี้เป็นไฟล์ CSV ไปใช้งานต่อได้ทันที',
          icon: 'print',
          position: 'bottom',
        },
      ];
      this.tourService.startTour('student-schedule', steps, force);
    }
  }
}
