import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../common/custom-select/custom-select';
import { ToastService } from '../../services/toast.service';
import { OnboardingTourService } from '../../services/onboarding-tour.service';

export interface PairedCourseDbRow {
  PAIR_COURSE_GROUP_ID: number;
  COURSE_NO: string;
  START_YEAR?: string | null;
  STOP_YEAR?: string | null;
  YEAR_LEVEL?: string | null;
  SEMESTER?: string | null;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
}

export interface PairedGroupView {
  groupId: number;
  courses: PairedCourseDbRow[];
}

export interface PairedCourseFormItem {
  courseNo: string;
  courseNameDisplay: string;
  yearLevel: string;
  semester: string;
  startYear: string;
  stopYear: string;
}

export interface UgbCourseOption {
  COURSE_NO: string;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
}

@Component({
  selector: 'app-tab-paired-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-paired-courses.html',
  styleUrl: './tab-paired-courses.css',
})
export class TabPairedCoursesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly tourService = inject(OnboardingTourService);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Paired Raw Rows from DB
  readonly rawRows = signal<PairedCourseDbRow[]>([]);

  // Selected Group IDs for Bulk Delete
  readonly selectedGroupIds = signal<number[]>([]);

  readonly selectedCount = computed(() => this.selectedGroupIds().length);

  // Grouped pairs view
  readonly groupedPairs = computed<PairedGroupView[]>(() => {
    const map = new Map<number, PairedCourseDbRow[]>();
    for (const row of this.rawRows()) {
      const gId = Number(row.PAIR_COURSE_GROUP_ID);
      if (!map.has(gId)) {
        map.set(gId, []);
      }
      map.get(gId)!.push(row);
    }

    const groups: PairedGroupView[] = [];
    map.forEach((courses, groupId) => {
      groups.push({ groupId, courses });
    });

    return groups.sort((a, b) => b.groupId - a.groupId);
  });

  // Filtered Groups for Main Table
  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.groupedPairs();
    if (!q) return list;

    return list.filter((g) => {
      const gMatch = `กลุ่มที่ ${g.groupId}`.toLowerCase().includes(q) || g.groupId.toString().includes(q);
      const courseMatch = g.courses.some((c) => {
        const code = (c.COURSE_NO || '').toLowerCase();
        const thai = (c.COURSE_NAME_THAI || '').toLowerCase();
        const eng = (c.COURSE_NAME_ENG_L || '').toLowerCase();
        return code.includes(q) || thai.includes(q) || eng.includes(q);
      });
      return gMatch || courseMatch;
    });
  });

  // Master Checkbox State
  readonly isAllSelected = computed(() => {
    const visible = this.filteredGroups();
    if (visible.length === 0) return false;
    const set = new Set(this.selectedGroupIds());
    return visible.every((g) => set.has(g.groupId));
  });

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  readonly editingGroupId = signal<number | null>(null);
  modalFormItems: PairedCourseFormItem[] = [];
  formError: string = '';

  // Detail Modal State
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly detailGroup = signal<PairedGroupView | null>(null);

  // Options for Year Level (ชั้นปี 1 - 4)
  readonly yearLevelOptions: SelectOption[] = [
    { value: '1', label: 'ชั้นปี 1', icon: 'looks_one' },
    { value: '2', label: 'ชั้นปี 2', icon: 'looks_two' },
    { value: '3', label: 'ชั้นปี 3', icon: 'looks_3' },
    { value: '4', label: 'ชั้นปี 4', icon: 'looks_4' },
  ];

  // Options for Semester (ภาค 1, ภาค 2)
  readonly semesterOptions: SelectOption[] = [
    { value: '1', label: 'ภาค 1', icon: 'looks_one' },
    { value: '2', label: 'ภาค 2', icon: 'looks_two' },
  ];

  // ============================================================
  // Inline Dropdown Course Search State (inside Modal Cards)
  // ============================================================
  readonly activeDropdownIndex = signal<number | null>(null);
  readonly inlineSearchQuery = signal<string>('');
  readonly inlineCourseResults = signal<UgbCourseOption[]>([]);
  readonly isInlineLoading = signal<boolean>(false);

  // ============================================================
  // Right Side Drawer State: Multi-Level Course Picker
  // ============================================================
  readonly isDrawerOpen = signal<boolean>(false);
  readonly targetItemIndex = signal<number | null>(null);

  readonly availableLetters = signal<string[]>([]);
  readonly isLettersLoading = signal<boolean>(false);
  readonly selectedLetter = signal<string | null>(null);

  readonly prefixGroups = signal<string[]>([]);
  readonly isPrefixesLoading = signal<boolean>(false);
  readonly selectedPrefix = signal<string | null>(null);

  readonly ugbCourses = signal<UgbCourseOption[]>([]);
  readonly isUgbCoursesLoading = signal<boolean>(false);

  readonly drawerCodeQuery = signal<string>('');
  readonly drawerNameQuery = signal<string>('');

  // Filtered Ugb Courses in Drawer
  readonly filteredUgbCourses = computed(() => {
    const codeQ = this.drawerCodeQuery().trim().toLowerCase();
    const nameQ = this.drawerNameQuery().trim().toLowerCase();
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

  ngOnInit(): void {
    this.loadPairCoursesList();
    this.loadFirstLetters();
  }

  private getBaseUrl(): string {
    return window.location.port === '4200' ? 'http://localhost:4000/api/service' : '/api/service';
  }

  // Load all paired courses from DB
  loadPairCoursesList(): void {
    this.isLoading.set(true);
    this.selectedGroupIds.set([]);

    this.http
      .get<{ success: boolean; results: PairedCourseDbRow[] }>(`${this.getBaseUrl()}/pair-course/list`)
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.success && Array.isArray(res.results)) {
            this.rawRows.set(res.results);
          } else {
            this.rawRows.set([]);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.rawRows.set([]);
        },
      });
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

  // Open Drawer for a specific course card item (e.g. วิชาคู่ที่ 1 หรือ 2)
  openDrawerFor(index: number): void {
    this.targetItemIndex.set(index);
    this.drawerCodeQuery.set('');
    this.drawerNameQuery.set('');
    this.isDrawerOpen.set(true);

    // Auto-select letter 'A' if not already selected
    const letters = this.availableLetters();
    if (letters.length > 0 && !this.selectedLetter()) {
      this.selectLetter(letters[0]);
    }
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.targetItemIndex.set(null);
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
      .get<{ success: boolean; results: UgbCourseOption[] }>(
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

  // Search by Course Code in Drawer
  onDrawerCodeSearchChange(code: string): void {
    this.drawerCodeQuery.set(code);
    this.triggerDrawerServerSearch();
  }

  // Search by Course Name in Drawer
  onDrawerNameSearchChange(name: string): void {
    this.drawerNameQuery.set(name);
    this.triggerDrawerServerSearch();
  }

  private triggerDrawerServerSearch(): void {
    const code = this.drawerCodeQuery().trim();
    const name = this.drawerNameQuery().trim();

    if (code.length >= 2 || name.length >= 2) {
      this.isUgbCoursesLoading.set(true);
      const params = new URLSearchParams();
      if (code) params.set('code', code);
      if (name) params.set('name', name);

      this.http
        .get<{ success: boolean; results: UgbCourseOption[] }>(
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

  // Select Course from Drawer for Target Item
  selectCourseFromDrawer(course: UgbCourseOption): void {
    const idx = this.targetItemIndex();
    if (idx !== null && idx >= 0 && idx < this.modalFormItems.length) {
      this.modalFormItems[idx].courseNo = course.COURSE_NO;
      const name = course.COURSE_NAME_THAI || course.COURSE_NAME_ENG_L || '';
      this.modalFormItems[idx].courseNameDisplay = `${course.COURSE_NO} ${name}`.trim();
      this.toastService.success(`เลือกวิชา ${course.COURSE_NO} สำหรับวิชาคู่ที่ ${idx + 1} แล้ว`);
      this.closeDrawer();
      this.formError = '';
    }
  }

  // ============================================================
  // Inline Dropdown Course Search Handlers (Direct Input Typing)
  // ============================================================
  openInlineDropdown(index: number): void {
    this.activeDropdownIndex.set(index);
    this.inlineSearchQuery.set('');
    this.loadInitialInlineCourses();
  }

  closeInlineDropdown(): void {
    this.activeDropdownIndex.set(null);
  }

  loadInitialInlineCourses(): void {
    this.isInlineLoading.set(true);
    this.http
      .get<{ success: boolean; results: UgbCourseOption[] }>(`${this.getBaseUrl()}/course/search-ugb?prefix=A`)
      .subscribe({
        next: (res) => {
          this.isInlineLoading.set(false);
          if (res && res.success && Array.isArray(res.results)) {
            this.inlineCourseResults.set(res.results.slice(0, 40));
          }
        },
        error: () => {
          this.isInlineLoading.set(false);
        },
      });
  }

  onInlineSearchChange(index: number, q: string): void {
    this.inlineSearchQuery.set(q);
    if (q.trim().length >= 1) {
      this.isInlineLoading.set(true);
      this.http
        .get<{ success: boolean; results: UgbCourseOption[] }>(
          `${this.getBaseUrl()}/course/search-ugb?query=${encodeURIComponent(q.trim())}`
        )
        .subscribe({
          next: (res) => {
            this.isInlineLoading.set(false);
            if (res && res.success && Array.isArray(res.results)) {
              this.inlineCourseResults.set(res.results.slice(0, 50));
            }
          },
          error: () => {
            this.isInlineLoading.set(false);
          },
        });
    } else {
      this.loadInitialInlineCourses();
    }
  }

  selectInlineCourse(index: number, course: UgbCourseOption): void {
    this.modalFormItems[index].courseNo = course.COURSE_NO;
    const name = course.COURSE_NAME_THAI || course.COURSE_NAME_ENG_L || '';
    this.modalFormItems[index].courseNameDisplay = `${course.COURSE_NO} ${name}`.trim();
    this.closeInlineDropdown();
    this.formError = '';
  }

  clearItemCourse(index: number): void {
    this.modalFormItems[index].courseNo = '';
    this.modalFormItems[index].courseNameDisplay = '';
    this.inlineSearchQuery.set('');
    this.loadInitialInlineCourses();
  }

  // Master Checkbox Toggle
  toggleSelectAll(): void {
    const visible = this.filteredGroups();
    if (visible.length === 0) return;

    if (this.isAllSelected()) {
      const visibleSet = new Set(visible.map((g) => g.groupId));
      this.selectedGroupIds.set(this.selectedGroupIds().filter((id) => !visibleSet.has(id)));
    } else {
      const current = [...this.selectedGroupIds()];
      const set = new Set(current);
      for (const g of visible) {
        if (!set.has(g.groupId)) {
          current.push(g.groupId);
          set.add(g.groupId);
        }
      }
      this.selectedGroupIds.set(current);
    }
  }

  // Single Row Checkbox Toggle
  toggleGroupSelect(groupId: number): void {
    const list = this.selectedGroupIds();
    if (list.includes(groupId)) {
      this.selectedGroupIds.set(list.filter((id) => id !== groupId));
    } else {
      this.selectedGroupIds.set([...list, groupId]);
    }
  }

  isGroupSelected(groupId: number): boolean {
    return this.selectedGroupIds().includes(groupId);
  }

  // Open Detail Modal for viewing full comparison
  openDetailModal(group: PairedGroupView): void {
    this.detailGroup.set(group);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.detailGroup.set(null);
  }

  editFromDetail(): void {
    const g = this.detailGroup();
    this.closeDetailModal();
    if (g) {
      this.openEditModal(g);
    }
  }

  // Open Modal for Add Paired Group
  openAddModal(): void {
    this.formError = '';
    this.closeDrawer();
    this.modalMode.set('add');
    this.editingGroupId.set(null);

    // Initialize with 2 empty course cards as requested
    this.modalFormItems = [
      {
        courseNo: '',
        courseNameDisplay: '',
        yearLevel: '1',
        semester: '1',
        startYear: '',
        stopYear: '',
      },
      {
        courseNo: '',
        courseNameDisplay: '',
        yearLevel: '1',
        semester: '1',
        startYear: '',
        stopYear: '',
      },
    ];

    this.isModalOpen.set(true);

    // Auto-trigger tutorial on first visit when modal opens
    if (!this.tourService.isTourCompleted('modal_add_pair_course_tour')) {
      setTimeout(() => {
        this.startModalTour(false);
      }, 300);
    }
  }

  // Open Modal for Edit Paired Group
  openEditModal(group: PairedGroupView): void {
    this.formError = '';
    this.closeDrawer();
    this.modalMode.set('edit');
    this.editingGroupId.set(group.groupId);

    this.modalFormItems = group.courses.map((c) => {
      const name = c.COURSE_NAME_THAI || c.COURSE_NAME_ENG_L || '';
      return {
        courseNo: c.COURSE_NO || '',
        courseNameDisplay: `${c.COURSE_NO || ''} ${name}`.trim(),
        yearLevel: c.YEAR_LEVEL || '1',
        semester: c.SEMESTER || '1',
        startYear: c.START_YEAR || '',
        stopYear: c.STOP_YEAR || '',
      };
    });

    this.isModalOpen.set(true);
  }

  // Trigger Modal Tour for Add/Edit Paired Group
  startModalTour(force: boolean = false): void {
    const steps = [
      {
        targetSelector: '.inline-search-input-box',
        title: '1. พิมพ์ค้นหารายวิชาโดยตรง',
        description: 'สามารถคลิกและพิมพ์รหัสวิชา (เช่น ACC1101) หรือชื่อวิชาลงในช่องนี้เพื่อค้นหาและเลือกจากรายการได้ทันที',
        icon: 'search',
        position: 'bottom' as const,
      },
      {
        targetSelector: '.btn-open-drawer-action',
        title: '2. ค้นหาจากหมวดตัวอักษร (ด้านขวา)',
        description: 'หากจำรหัสวิชาไม่ได้ สามารถคลิกปุ่มนี้เพื่อเปิดแผงค้นหารายวิชาด้านข้างขวา โดยเลือกตามตัวอักษรนำหน้า (A, B, C...) ได้สะดวก',
        icon: 'manage_search',
        position: 'bottom' as const,
      },
      {
        targetSelector: '.btn-add-more, .add-more-row',
        title: '3. เพิ่มวิชาคู่ที่ 3, 4...',
        description: 'หากวิชานั้นมีการเทียบเคียงหลายรหัสในช่วงปีหลักสูตรที่แตกต่างกัน สามารถกดปุ่มนี้เพื่อเพิ่มวิชาคู่รายการถัดไปได้',
        icon: 'add_circle',
        position: 'top' as const,
      },
      {
        targetSelector: '.modal-footer .btn-primary, .modal-footer',
        title: '4. บันทึกกลุ่มวิชาคู่',
        description: 'ตรวจสอบข้อมูลและช่วงปีเริ่มต้น-สิ้นสุด แล้วกดปุ่มบันทึกข้อมูลเพื่อบันทึกกลุ่มวิชาคู่ลงในระบบ',
        icon: 'save',
        position: 'top' as const,
        actionHint: 'แตะที่ใดก็ได้บนหน้าจอเพื่อเริ่มใช้งาน',
      },
    ];
    this.tourService.startTour('modal_add_pair_course_tour', steps, force);
  }

  // Add a 3rd, 4th, etc. course item card dynamically
  addMoreCourseItem(): void {
    this.modalFormItems.push({
      courseNo: '',
      courseNameDisplay: '',
      yearLevel: '1',
      semester: '1',
      startYear: '',
      stopYear: '',
    });
  }

  // Remove a course item card (Allowed if items > 2)
  removeCourseItem(index: number): void {
    if (this.modalFormItems.length > 2) {
      this.modalFormItems.splice(index, 1);
      if (this.targetItemIndex() === index) {
        this.closeDrawer();
      }
    }
  }

  // Save Paired Group to DB (Add or Update)
  savePairGroup(): void {
    if (this.isSaving()) return;

    if (this.modalFormItems.length < 2) {
      this.formError = 'การจับคู่วิชาต้องระบุอย่างน้อย 2 วิชาขึ้นไป';
      return;
    }

    // Validate each item
    for (let i = 0; i < this.modalFormItems.length; i++) {
      const item = this.modalFormItems[i];
      if (!item.courseNo.trim()) {
        this.formError = `กรุณาเลือกวิชาสำหรับวิชาคู่ที่ ${i + 1}`;
        return;
      }
    }

    this.formError = '';
    this.isSaving.set(true);

    const payload = {
      items: this.modalFormItems.map((item) => ({
        courseNo: item.courseNo.trim(),
        startYear: item.startYear.trim(),
        stopYear: item.stopYear.trim(),
        yearLevel: item.yearLevel,
        semester: item.semester,
      })),
    };

    if (this.modalMode() === 'edit' && this.editingGroupId()) {
      const gId = this.editingGroupId()!;
      this.http
        .put<{ success: boolean; message: string; groupId?: number }>(
          `${this.getBaseUrl()}/pair-course/update/${gId}`,
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
            this.toastService.success(res.message || `แก้ไขกลุ่มวิชาคู่ที่ ${gId} สำเร็จ`);
            this.closeModal();
            this.loadPairCoursesList();
          },
          error: (err) => {
            this.isSaving.set(false);
            const msg = err?.error?.message || 'เกิดข้อผิดพลาดในการแก้ไขกลุ่มวิชาคู่';
            this.formError = msg;
            this.toastService.error(msg);
          },
        });
    } else {
      this.http
        .post<{ success: boolean; message: string; groupId?: number }>(
          `${this.getBaseUrl()}/pair-course/add`,
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
            this.toastService.success(res.message || 'บันทึกกลุ่มวิชาคู่สำเร็จ');
            this.closeModal();
            this.loadPairCoursesList();
          },
          error: (err) => {
            this.isSaving.set(false);
            const msg = err?.error?.message || 'เกิดข้อผิดพลาดในการบันทึกกลุ่มวิชาคู่';
            this.formError = msg;
            this.toastService.error(msg);
          },
        });
    }
  }

  // Delete Individual Paired Group -> Stored in RG_SCHEDULE_PAIR_COURSE_HIS
  deleteGroup(groupId: number): void {
    if (this.isDeleting()) return;

    if (
      confirm(
        `คุณต้องการลบ "กลุ่มวิชาคู่ที่ ${groupId}" ใช่หรือไม่?\n(ระบบจะจัดเก็บประวัติการลบไว้ในตาราง HIS)`
      )
    ) {
      this.isDeleting.set(true);
      this.http.delete(`${this.getBaseUrl()}/pair-course/delete/${groupId}`).subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.toastService.success(`ลบกลุ่มวิชาคู่ที่ ${groupId} สำเร็จ (จัดเก็บประวัติลง HIS เรียบร้อย)`);
          this.loadPairCoursesList();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.toastService.error(err?.error?.message || 'เกิดข้อผิดพลาดในการลบกลุ่มวิชาคู่');
        },
      });
    }
  }

  // Bulk Delete Multiple Groups
  deleteSelectedGroups(): void {
    if (this.isDeleting()) return;

    const ids = this.selectedGroupIds();
    if (ids.length === 0) return;

    if (
      confirm(
        `คุณต้องการลบ ${ids.length} กลุ่มวิชาคู่ที่เลือก ใช่หรือไม่?\n(ระบบจะจัดเก็บประวัติการลบทั้งหมดไว้ในตาราง HIS)`
      )
    ) {
      this.isDeleting.set(true);
      this.http
        .post<{ success: boolean; message: string; deletedCount?: number }>(
          `${this.getBaseUrl()}/pair-course/delete-bulk`,
          { groupIds: ids }
        )
        .subscribe({
          next: (res) => {
            this.isDeleting.set(false);
            this.toastService.success(
              res.message || `ลบ ${ids.length} กลุ่มวิชาคู่สำเร็จ (จัดเก็บประวัติลง HIS เรียบร้อย)`
            );
            this.selectedGroupIds.set([]);
            this.loadPairCoursesList();
          },
          error: (err) => {
            this.isDeleting.set(false);
            this.toastService.error(err?.error?.message || 'เกิดข้อผิดพลาดในการลบกลุ่มที่เลือก');
          },
        });
    }
  }

  closeModal(): void {
    this.closeDrawer();
    this.isModalOpen.set(false);
  }
}
