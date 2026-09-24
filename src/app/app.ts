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
import { TabTimetableManageComponent } from './components/timetable/tab-timetable-manage/tab-timetable-manage';
import { TabStudentScheduleComponent } from './components/timetable/tab-student-schedule/tab-student-schedule';

// Group 4: รายงาน (Reports)
import { TabReportCompulsoryComponent } from './components/reports/tab-report-compulsory/tab-report-compulsory';
import { TabReportFacultyYearComponent } from './components/reports/tab-report-faculty-year/tab-report-faculty-year';
import { TabReportMr30Component } from './components/reports/tab-report-mr30/tab-report-mr30';
import { TabReportOfferedCoursesComponent } from './components/reports/tab-report-offered-courses/tab-report-offered-courses';

import { AuthService } from './services/auth.service';
import { SkeletonComponent } from './components/common/skeleton/skeleton';
import { ToastContainerComponent } from './components/common/toast-container/toast-container';
import { OnboardingTourComponent } from './components/common/onboarding-tour/onboarding-tour';
import { ConfirmDialogComponent } from './components/common/confirm-dialog/confirm-dialog';
import { OnboardingTourService } from './services/onboarding-tour.service';
import { TOUR_STEPS } from './app.tour-steps';

import { TabLockService } from './services/tab-lock.service';
import { ToastService } from './services/toast.service';
import { ThemeService } from './services/theme.service';
import { ConfirmDialogService } from './services/confirm-dialog.service';
import { YearSemService } from './services/yearsem.service';

const STORAGE_KEY_ACTIVE_TAB = 'timetable_active_tab';

function getInitialActiveTab(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
    const validTabs = [
      'academic-year',
      'curriculum',
      'instructor',
      'course-search',
      'paired-courses',
      'timetable-manage',
      'student-schedule',
      'report-compulsory',
      'report-faculty-year',
      'report-mr30',
      'report-offered-courses',
    ];
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore error if localStorage is not accessible
  }
  return 'timetable-manage';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TabNavComponent,
    LoginPageComponent,
    SkeletonComponent,
    ToastContainerComponent,
    OnboardingTourComponent,
    ConfirmDialogComponent,
    TabAcademicYearComponent,
    TabCurriculumComponent,
    TabCourseSearchComponent,
    TabPairedCoursesComponent,
    TabTimetableManageComponent,
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
  private readonly yearSemService = inject(YearSemService);
  readonly authService = inject(AuthService);
  readonly tourService = inject(OnboardingTourService);
  readonly tabLockService = inject(TabLockService);
  readonly toastService = inject(ToastService);
  readonly themeService = inject(ThemeService);
  readonly confirmDialogService = inject(ConfirmDialogService);

  readonly activeTab = signal<string>(getInitialActiveTab());
  readonly activeSemesterText = signal<string>('ภาคเรียน -/-');

  constructor() {
    this.yearSemService.getActiveYearSem().subscribe({
      next: (res) => {
        if (res && res.results && res.results.STUDY_YEAR && res.results.STUDY_SEMESTER) {
          this.activeSemesterText.set(`ภาคเรียน ${res.results.STUDY_SEMESTER}/${res.results.STUDY_YEAR}`);
        }
      },
      error: () => {
        // Fallback default
      },
    });
  }

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
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tabId);
    } catch {
      // Ignore localStorage errors
    }
  }

  // Trigger Tour for current active tab
  startCurrentTabTour(force: boolean = true): void {
    const tab = this.activeTab();
    const steps = TOUR_STEPS[tab];
    if (steps && steps.length > 0) {
      this.tourService.startTour(tab, steps, force);
    }
  }

  onAvatarError(event: Event): void {
    const target = event.target as HTMLElement;
    if (target) {
      target.style.display = 'none';
    }
  }

  async onLogout(): Promise<void> {
    if (this.tabLockService.isLocked()) {
      this.toastService.warning('กรุณาบันทึกหรือยกเลิกการปรับตารางก่อนออกจากระบบ');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการออกจากระบบ',
      message: 'คุณต้องการออกจากระบบจัดการตารางสอนใช่หรือไม่?',
      detail: 'เมื่อออกจากระบบแล้ว คุณจะต้องลงชื่อเข้าใช้งานใหม่อีกครั้ง',
      confirmText: 'ออกจากระบบ',
      cancelText: 'ยกเลิก',
      variant: 'warning',
      icon: 'logout',
    });

    if (confirmed) {
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
      } catch {
        // Ignore error
      }
      this.activeTab.set('academic-year');
      this.authService.logout();
    }
  }
}
