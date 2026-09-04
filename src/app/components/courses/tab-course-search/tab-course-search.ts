import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { ToastService } from '../../../services/toast.service';
import { OnboardingTourService } from '../../../services/onboarding-tour.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

export interface ScheduleCourseItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  COURSE_REMARK?: string | null;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
  SCHEDULE_COUNT?: number;
  IS_SCHEDULED?: boolean;
}

export interface UgbCourseItem {
  COURSE_NO: string;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
}

export interface YearSemOption {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  STUDY_ACTIVE: string;
}

import { CustomCheckboxComponent } from '../../common/custom-checkbox/custom-checkbox';
import { CustomContextMenuComponent, ContextMenuItem } from '../../common/custom-context-menu/custom-context-menu.component';

@Component({
  selector: 'app-tab-course-search',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent, CustomCheckboxComponent, CustomContextMenuComponent],
  templateUrl: './tab-course-search.html',
  styleUrl: './tab-course-search.css',
})
export class TabCourseSearchComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly tourService = inject(OnboardingTourService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Context Menu State
  readonly isContextMenuOpen = signal<boolean>(false);
  readonly contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly selectedContextMenuCourse = signal<ScheduleCourseItem | null>(null);

  readonly contextMenuItems = computed<ContextMenuItem[]>(() => {
    const item = this.selectedContextMenuCourse();
    if (!item) return [];

    const isScheduled = !!item.IS_SCHEDULED || ((item.SCHEDULE_COUNT ?? 0) > 0);
    return [
      {
        id: 'delete',
        label: 'ลบวิชาที่เปิดสอน',
        sublabel: isScheduled ? `ติดตารางสอน ${item.SCHEDULE_COUNT} คาบ (ลบไม่ได้)` : `วิชา ${item.COURSE_NO} (ย้ายลง HIS)`,
        icon: 'delete',
        iconType: 'delete',
        variant: 'danger',
        disabled: isScheduled,
        action: () => this.deleteCourse(item),
      },
    ];
  });

  onRowContextMenu(event: MouseEvent, item: ScheduleCourseItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedContextMenuCourse.set(item);
    this.contextMenuPos.set({ x: event.clientX, y: event.clientY });
    this.isContextMenuOpen.set(true);
  }

  openMenuFromBtn(event: MouseEvent, item: ScheduleCourseItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedContextMenuCourse.set(item);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.contextMenuPos.set({ x: rect.left, y: rect.bottom + 4 });
    this.isContextMenuOpen.set(true);
  }

  // Selected Year & Semester for filtering offered courses
  readonly yearSemList = signal<YearSemOption[]>([]);
  readonly selectedYear = signal<string>('2569');
  readonly selectedSemester = signal<string>('1');

  // Offered Courses List
  readonly courses = signal<ScheduleCourseItem[]>([]);

  // Main Table Multi-Selection for Bulk Delete
  readonly selectedTableCourseNos = signal<string[]>([]);

  readonly selectedTableCount = computed(() => this.selectedTableCourseNos().length);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);

  // Modal Form Values
  modalStudyYear: string = '2569';
  modalStudySemester: string = '1';
  modalRemark: string = '';
  formError: string = '';

  // Multi-Level Course Picker State in Modal
  readonly availableLetters = signal<string[]>([]);
  readonly isLettersLoading = signal<boolean>(false);
  readonly selectedLetter = signal<string | null>(null);

  readonly prefixGroups = signal<string[]>([]);
  readonly isPrefixesLoading = signal<boolean>(false);
  readonly selectedPrefix = signal<string | null>(null);

  readonly ugbCourses = signal<UgbCourseItem[]>([]);
  readonly isUgbCoursesLoading = signal<boolean>(false);

  // 2 Separate Search Inputs in Picker: Code & Name
  readonly pickerCodeQuery = signal<string>('');
  readonly pickerNameQuery = signal<string>('');

  // Multi-Selected Courses in Modal
  readonly selectedCourses = signal<UgbCourseItem[]>([]);

  readonly selectedCoursesCount = computed(() => this.selectedCourses().length);

  // YearSem Dropdown Options for CustomSelectComponent
  readonly yearSemSelectOptions = computed<SelectOption[]>(() => {
    return this.yearSemList().map((y) => ({
      value: `${y.STUDY_YEAR}_${y.STUDY_SEMESTER}`,
      label: `ปี ${y.STUDY_YEAR} ภาค ${y.STUDY_SEMESTER}`,
      badge: y.STUDY_ACTIVE === '1' ? 'ปีภาคปัจจุบัน' : undefined,
      icon: 'event_available',
    }));
  });

  readonly selectedYearSemKey = computed(() => {
    return `${this.selectedYear()}_${this.selectedSemester()}`;
  });

  // Filtered Offered Courses for main table
  readonly filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.courses();
    if (!q) return list;

    return list.filter((c) => {
      const code = (c.COURSE_NO || '').toLowerCase();
      const thai = (c.COURSE_NAME_THAI || '').toLowerCase();
      const eng = (c.COURSE_NAME_ENG_L || '').toLowerCase();
      const remark = (c.COURSE_REMARK || '').toLowerCase();
      return code.includes(q) || thai.includes(q) || eng.includes(q) || remark.includes(q);
    });
  });

  // Pagination State (10 items per page)
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly totalItems = computed(() => this.filteredCourses().length);
  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  readonly startItemIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endItemIndex = computed(() => {
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, this.totalItems());
  });

  readonly displayedPageNumbers = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  });

  readonly paginatedCourses = computed(() => {
    const list = this.filteredCourses();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Deletable (non-scheduled) offered courses
  readonly deletableCourses = computed(() => {
    return this.filteredCourses().filter((c) => !c.IS_SCHEDULED);
  });

  // Check if all visible deletable table rows are selected
  readonly isAllTableSelected = computed(() => {
    const deletable = this.deletableCourses();
    if (deletable.length === 0) return false;
    const selectedSet = new Set(this.selectedTableCourseNos());
    return deletable.every((c) => selectedSet.has(c.COURSE_NO));
  });

  // Filtered UGB courses in Picker by both Code and Name
  readonly filteredUgbCourses = computed(() => {
    const codeQ = this.pickerCodeQuery().trim().toLowerCase();
    const nameQ = this.pickerNameQuery().trim().toLowerCase();
    const list = this.ugbCourses();

    if (!codeQ && !nameQ) return list;

    return list.filter((c) => {
      const code = (c.COURSE_NO || '').toLowerCase();
      const thai = (c.COURSE_NAME_THAI || '').toLowerCase();
      const eng = (c.COURSE_NAME_ENG_L || '').toLowerCase();

      const matchCode = !codeQ || code.includes(codeQ);
      const matchName = !nameQ || thai.includes(nameQ) || eng.includes(nameQ);

      return matchCode && matchName;
    });
  });

  readonly isAllGroupSelected = computed(() => {
    const visible = this.filteredUgbCourses();
    if (visible.length === 0) return false;
    const selectedSet = new Set(this.selectedCourses().map((c) => c.COURSE_NO));
    return visible.every((c) => selectedSet.has(c.COURSE_NO));
  });

  // Combined fetching lock state to prevent double clicks/fetches
  readonly isBusy = computed(() => {
    return (
      this.isLoading() ||
      this.isSaving() ||
      this.isDeleting() ||
      this.isPrefixesLoading() ||
      this.isUgbCoursesLoading()
    );
  });

  ngOnInit(): void {
    this.loadYearSemOptions();
    this.loadFirstLetters();
  }

  private getBaseUrl(): string {
    return window.location.port === '4200' ? 'http://localhost:4000/api/service' : '/api/service';
  }

  // Load Year & Semester options from RG_SCHEDULE_YEARSEM
  loadYearSemOptions(): void {
    this.http.get<{ success: boolean; results: YearSemOption[] }>(`${this.getBaseUrl()}/yearsem/list`).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.results)) {
          this.yearSemList.set(res.results);
          const active = res.results.find((y) => y.STUDY_ACTIVE === '1');
          if (active) {
            this.selectedYear.set(active.STUDY_YEAR);
            this.selectedSemester.set(active.STUDY_SEMESTER);
          } else if (res.results.length > 0) {
            this.selectedYear.set(res.results[0].STUDY_YEAR);
            this.selectedSemester.set(res.results[0].STUDY_SEMESTER);
          }
          this.loadCourseList();
        }
      },
      error: () => {
        this.loadCourseList();
      },
    });
  }

  // Load Offered Courses for Selected Year & Semester
  loadCourseList(): void {
    this.isLoading.set(true);
    this.selectedTableCourseNos.set([]);
    const year = this.selectedYear();
    const semester = this.selectedSemester();

    this.http
      .get<{ success: boolean; results: ScheduleCourseItem[] }>(
        `${this.getBaseUrl()}/course/list?year=${year}&semester=${semester}`
      )
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.success && Array.isArray(res.results)) {
            this.courses.set(res.results);
          } else {
            this.courses.set([]);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.courses.set([]);
        },
      });
  }

  onYearSemChange(key: string): void {
    if (key && !this.isLoading()) {
      const [y, s] = key.split('_');
      this.selectedYear.set(y);
      this.selectedSemester.set(s);
      this.currentPage.set(1);
      this.loadCourseList();
    }
  }

  // Table Row Selection
  isTableCourseSelected(courseNo: string): boolean {
    return this.selectedTableCourseNos().includes(courseNo);
  }

  toggleTableCourseSelect(courseNo: string): void {
    const list = this.selectedTableCourseNos();
    if (list.includes(courseNo)) {
      this.selectedTableCourseNos.set(list.filter((c) => c !== courseNo));
    } else {
      this.selectedTableCourseNos.set([...list, courseNo]);
    }
  }

  toggleSelectAllTable(): void {
    const deletable = this.deletableCourses();
    if (deletable.length === 0) return;

    if (this.isAllTableSelected()) {
      const deletableSet = new Set(deletable.map((c) => c.COURSE_NO));
      this.selectedTableCourseNos.set(this.selectedTableCourseNos().filter((c) => !deletableSet.has(c)));
    } else {
      const current = [...this.selectedTableCourseNos()];
      const set = new Set(current);
      for (const item of deletable) {
        if (!set.has(item.COURSE_NO)) {
          current.push(item.COURSE_NO);
          set.add(item.COURSE_NO);
        }
      }
      this.selectedTableCourseNos.set(current);
    }
  }

  // Load First Letters (A, B, C...)
  loadFirstLetters(): void {
    this.isLettersLoading.set(true);
    this.http.get<{ success: boolean; results: string[] }>(`${this.getBaseUrl()}/course/letters`).subscribe({
      next: (res) => {
        this.isLettersLoading.set(false);
        if (res && res.success && Array.isArray(res.results)) {
          this.availableLetters.set(res.results);
        }
      },
      error: () => {
        this.isLettersLoading.set(false);
      },
    });
  }

  // Level 1: Click Letter -> Fetch Prefixes (e.g. A -> ACC, ACT, ANT...)
  selectLetter(letter: string): void {
    if (this.isPrefixesLoading()) return;
    this.selectedLetter.set(letter);
    this.selectedPrefix.set(null);
    this.ugbCourses.set([]);
    this.isPrefixesLoading.set(true);

    this.http
      .get<{ success: boolean; results: string[] }>(`${this.getBaseUrl()}/course/prefixes/${letter}`)
      .subscribe({
        next: (res) => {
          this.isPrefixesLoading.set(false);
          if (res && res.success && Array.isArray(res.results)) {
            this.prefixGroups.set(res.results);
            if (res.results.length > 0) {
              this.selectPrefix(res.results[0]);
            }
          }
        },
        error: () => {
          this.isPrefixesLoading.set(false);
        },
      });
  }

  // Level 2: Click Prefix -> Fetch Courses (e.g. ACC -> ACC1101, ACC1102...)
  selectPrefix(prefix: string): void {
    if (this.isUgbCoursesLoading()) return;
    this.selectedPrefix.set(prefix);
    this.isUgbCoursesLoading.set(true);

    this.http
      .get<{ success: boolean; results: UgbCourseItem[] }>(
        `${this.getBaseUrl()}/course/search-ugb?prefix=${prefix}`
      )
      .subscribe({
        next: (res) => {
          this.isUgbCoursesLoading.set(false);
          if (res && res.success && Array.isArray(res.results)) {
            this.ugbCourses.set(res.results);
          }
        },
        error: () => {
          this.isUgbCoursesLoading.set(false);
        },
      });
  }

  // Search by Course Code
  onPickerCodeSearchChange(code: string): void {
    this.pickerCodeQuery.set(code);
    this.triggerPickerServerSearch();
  }

  // Search by Course Name (Thai or English)
  onPickerNameSearchChange(name: string): void {
    this.pickerNameQuery.set(name);
    this.triggerPickerServerSearch();
  }

  // Trigger search on backend if input length >= 2
  private triggerPickerServerSearch(): void {
    const code = this.pickerCodeQuery().trim();
    const name = this.pickerNameQuery().trim();

    if (code.length >= 2 || name.length >= 2) {
      this.isUgbCoursesLoading.set(true);
      const params = new URLSearchParams();
      if (code) params.set('code', code);
      if (name) params.set('name', name);

      this.http
        .get<{ success: boolean; results: UgbCourseItem[] }>(
          `${this.getBaseUrl()}/course/search-ugb?${params.toString()}`
        )
        .subscribe({
          next: (res) => {
            this.isUgbCoursesLoading.set(false);
            if (res && res.success && Array.isArray(res.results)) {
              this.ugbCourses.set(res.results);
            }
          },
          error: () => {
            this.isUgbCoursesLoading.set(false);
          },
        });
    } else if (!code && !name && this.selectedPrefix()) {
      this.selectPrefix(this.selectedPrefix()!);
    }
  }

  // Modal Check if a course is currently selected
  isCourseSelected(courseNo: string): boolean {
    return this.selectedCourses().some((c) => c.COURSE_NO === courseNo);
  }

  // Modal Toggle single course selection
  toggleCourse(course: UgbCourseItem): void {
    this.formError = '';
    const current = this.selectedCourses();
    const exists = current.some((c) => c.COURSE_NO === course.COURSE_NO);
    if (exists) {
      this.selectedCourses.set(current.filter((c) => c.COURSE_NO !== course.COURSE_NO));
    } else {
      this.selectedCourses.set([...current, course]);
    }
  }

  // Modal Toggle select all courses in current visible list
  toggleSelectAllInGroup(): void {
    const visible = this.filteredUgbCourses();
    if (visible.length === 0) return;

    if (this.isAllGroupSelected()) {
      const visibleSet = new Set(visible.map((c) => c.COURSE_NO));
      this.selectedCourses.set(this.selectedCourses().filter((c) => !visibleSet.has(c.COURSE_NO)));
    } else {
      const existing = [...this.selectedCourses()];
      const existingSet = new Set(existing.map((c) => c.COURSE_NO));
      for (const item of visible) {
        if (!existingSet.has(item.COURSE_NO)) {
          existing.push(item);
          existingSet.add(item.COURSE_NO);
        }
      }
      this.selectedCourses.set(existing);
    }
  }

  // Remove a course chip from selected list
  removeSelectedCourse(courseNo: string): void {
    this.selectedCourses.set(this.selectedCourses().filter((c) => c.COURSE_NO !== courseNo));
  }

  // Clear all modal selections
  clearAllSelected(): void {
    this.selectedCourses.set([]);
  }

  // Open Modal for Add (Blocked if no academic year/semester exists)
  openAddModal(): void {
    if (this.yearSemList().length === 0 || !this.selectedYear() || !this.selectedSemester()) {
      this.toastService.warning('ยังไม่มีข้อมูลปีภาคการศึกษาในระบบ กรุณาไปที่เมนู "จัดการปีภาค" เพื่อเพิ่มข้อมูลก่อน');
      return;
    }

    this.modalStudyYear = this.selectedYear();
    this.modalStudySemester = this.selectedSemester();
    this.selectedCourses.set([]);
    this.pickerCodeQuery.set('');
    this.pickerNameQuery.set('');
    this.formError = '';

    // Auto-select letter 'A' if available
    const letters = this.availableLetters();
    if (letters.length > 0) {
      this.selectLetter(letters[0]);
    }

    this.isModalOpen.set(true);

    // Auto-trigger tutorial on first visit when modal opens
    if (!this.tourService.isTourCompleted('modal_add_course_tour')) {
      setTimeout(() => {
        this.startModalTour(false);
      }, 300);
    }
  }

  // Trigger Modal Tour for Add Offered Courses
  startModalTour(force: boolean = false): void {
    const steps = [
      {
        targetSelector: '.letters-pill-row',
        title: '1. เลือกตัวอักษรแรกของรหัสวิชา',
        description: 'คลิกเลือกตัวอักษรนำหน้าแรก เช่น A, B, C, D... เพื่อกรองกลุ่มรายวิชาที่ต้องการ',
        icon: 'abc',
        position: 'bottom' as const,
      },
      {
        targetSelector: '.prefix-pill-row',
        title: '2. เลือกกลุ่มรหัสวิชา',
        description: 'เลือกกลุ่มรหัสวิชา เช่น ACC, ACT, ANT... ที่ขึ้นต้นด้วยตัวอักษรที่เลือก',
        icon: 'folder_open',
        position: 'bottom' as const,
      },
      {
        targetSelector: '.picker-dual-search-container, .ugb-course-scroll-box',
        title: '3. ค้นหาและเลือกรายวิชา (เลือกได้หลายวิชา)',
        description: 'ค้นหาด้วยรหัสวิชาหรือชื่อวิชา (ไทย/อังกฤษ) และสามารถติ๊กเลือกหลายวิชาพร้อมกันได้',
        icon: 'fact_check',
        position: 'top' as const,
      },
      {
        targetSelector: '.modal-footer .btn-primary, .modal-footer',
        title: '4. บันทึกข้อมูลวิชาที่เปิดสอน',
        description: 'ตรวจสอบรายวิชาที่เลือกทั้งหมด แล้วคลิกปุ่ม "บันทึกข้อมูล" เพื่อเพิ่มวิชาลงในระบบ',
        icon: 'save',
        position: 'top' as const,
        actionHint: 'แตะที่ใดก็ได้บนหน้าจอเพื่อเริ่มใช้งาน',
      },
    ];
    this.tourService.startTour('modal_add_course_tour', steps, force);
  }

  // Save Courses (Bulk Add multiple courses)
  saveCourse(): void {
    if (this.isSaving()) return;

    const list = this.selectedCourses();
    if (list.length === 0) {
      this.formError = 'กรุณาเลือกวิชาจากตาราง UGB_COURSE อย่างน้อย 1 วิชา';
      return;
    }

    const year = this.modalStudyYear.trim();
    const sem = this.modalStudySemester.trim();
    const courseNos = list.map((c) => c.COURSE_NO.trim());

    this.formError = '';
    this.isSaving.set(true);

    const payload = {
      studyYear: year,
      studySemester: sem,
      courseNos,
      courseRemark: null,
    };

    this.http
      .post<{ success: boolean; message: string; addedCount?: number; skippedCount?: number }>(
        `${this.getBaseUrl()}/course/add`,
        payload
      )
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res && res.success === false) {
            this.formError = res.message;
            this.toastService.error(res.message);
            return;
          }
          this.toastService.success(
            res.message || `เพิ่มวิชา ${courseNos.length} รายการ ประจำปี ${year} ภาค ${sem} สำเร็จ`
          );
          this.closeModal();
          this.loadCourseList();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || 'เกิดข้อผิดพลาดในการเพิ่มวิชา';
          this.formError = msg;
          this.toastService.error(msg);
        },
      });
  }

  // Delete Individual Course -> Stored in RG_SCHEDULE_COURSE_HIS
  async deleteCourse(item: ScheduleCourseItem): Promise<void> {
    if (this.isDeleting()) return;

    if (item.IS_SCHEDULED || (item.SCHEDULE_COUNT && item.SCHEDULE_COUNT > 0)) {
      this.toastService.error(
        `ไม่สามารถลบวิชา "${item.COURSE_NO}" ได้ เนื่องจากถูกจัดลงในตารางสอนแล้ว (${item.SCHEDULE_COUNT} คาบ) กรุณาลบตารางสอนของวิชานี้ก่อน`,
        'ไม่สามารถลบได้'
      );
      return;
    }

    const courseTitle = `${item.COURSE_NO} ${item.COURSE_NAME_THAI || item.COURSE_NAME_ENG_L || ''}`.trim();
    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการลบวิชา',
      message: `คุณต้องการลบวิชา "${courseTitle}" ใช่หรือไม่?`,
      detail: 'ระบบจะจัดเก็บประวัติการลบไว้ในตาราง HIS โดยอัตโนมัติ',
      confirmText: 'ลบวิชานี้',
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });

    if (!confirmed) return;

    this.isDeleting.set(true);
    this.http
      .delete(`${this.getBaseUrl()}/course/delete/${item.STUDY_YEAR}/${item.STUDY_SEMESTER}/${item.COURSE_NO}`)
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.toastService.success(`ลบวิชา ${item.COURSE_NO} สำเร็จ`);
          this.loadCourseList();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.toastService.error(err?.error?.message || 'ลบวิชาไม่สำเร็จ');
        },
      });
  }

  // Bulk Delete Multiple Selected Courses from Table
  async deleteSelectedTableCourses(): Promise<void> {
    if (this.isDeleting()) return;

    const selectedNos = this.selectedTableCourseNos();
    if (selectedNos.length === 0) return;

    // ตรวจสอบว่ามีวิชาที่ติดตารางสอนอยู่หรือไม่
    const scheduledSelected = this.courses().filter(
      (c) => selectedNos.includes(c.COURSE_NO) && c.IS_SCHEDULED
    );

    if (scheduledSelected.length > 0) {
      const names = scheduledSelected.map((s) => s.COURSE_NO).join(', ');
      this.toastService.error(
        `ไม่สามารถลบได้ เนื่องจากมีวิชา ${scheduledSelected.length} วิชาถูกจัดลงในตารางสอนแล้ว: ${names}`,
        'ไม่สามารถลบได้'
      );
      return;
    }

    const year = this.selectedYear();
    const sem = this.selectedSemester();

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการลบแบบกลุ่ม',
      message: `คุณต้องการลบรายวิชาที่เลือกจำนวน ${selectedNos.length} รายการ ใช่หรือไม่?`,
      detail: 'ระบบจะจัดเก็บประวัติการลบของทุกวิชาไว้ในตาราง HIS',
      confirmText: `ลบ ${selectedNos.length} รายการ`,
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });

    if (!confirmed) return;

    this.isDeleting.set(true);
    this.http
      .post<{ success: boolean; message: string; deletedCount?: number }>(
        `${this.getBaseUrl()}/course/delete-bulk`,
        {
          year,
          semester: sem,
          courseNos: selectedNos,
        }
      )
      .subscribe({
        next: (res) => {
          this.isDeleting.set(false);
          this.toastService.success(`ลบวิชา ${selectedNos.length} รายการ สำเร็จ`);
          this.selectedTableCourseNos.set([]);
          this.loadCourseList();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.toastService.error(err?.error?.message || 'ลบรายการไม่สำเร็จ');
        },
      });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }
}
