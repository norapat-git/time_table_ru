import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { OnboardingTourService } from '../../../services/onboarding-tour.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';

export interface ScheduleInstructorItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  INSTRUCTOR_NAME_RU30?: string;
  RANK_NO?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  FACULTY_NO?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  DEPARTMENT_NO?: string;
  INSTRUCTOR_TYPE?: string;
  INSTRUCTOR_SEX?: string;
  PRENAME_NO?: string;
  FLAG_DISPLAY?: string;
  PERSONAL_ID?: string;
  INSERT_DATE?: string;
  USER_INSERT?: string;
  SCHEDULE_COUNT?: number;
  IS_SCHEDULED?: boolean;
}

export interface MasterInstructorOption {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI: string;
  INSTRUCTOR_NAME_ENG?: string;
  INSTRUCTOR_NAME_RU30?: string;
  RANK_NO?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  FACULTY_NO?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  DEPARTMENT_NO?: string;
  INSTRUCTOR_TYPE?: string;
  INSTRUCTOR_SEX?: string;
  PRENAME_NO?: string;
  FLAG_DISPLAY?: string;
  PERSONAL_ID?: string;
}

export interface FacultyOption {
  FACULTY_NO: string;
  FACULTY_NAME_THAI: string;
  FACULTY_NAME_SHORT?: string;
}

import { CustomCheckboxComponent } from '../../common/custom-checkbox/custom-checkbox';
import { CustomContextMenuComponent, ContextMenuItem } from '../../common/custom-context-menu/custom-context-menu.component';

@Component({
  selector: 'app-tab-instructor',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent, CustomCheckboxComponent, CustomContextMenuComponent],
  templateUrl: './tab-instructor.html',
  styleUrl: './tab-instructor.css',
})
export class TabInstructorComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly tourService = inject(OnboardingTourService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  // Context Menu State
  readonly isContextMenuOpen = signal<boolean>(false);
  readonly contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly selectedContextMenuInstructor = signal<ScheduleInstructorItem | null>(null);

  readonly contextMenuItems = computed<ContextMenuItem[]>(() => {
    const item = this.selectedContextMenuInstructor();
    if (!item) return [];

    const isScheduled = !!item.IS_SCHEDULED || ((item.SCHEDULE_COUNT ?? 0) > 0);
    const items: ContextMenuItem[] = [
      {
        id: 'detail',
        label: 'ดูรายละเอียดอาจารย์',
        sublabel: `${item.RANK_NAME_THAI_S || ''} ${item.INSTRUCTOR_NAME_THAI || item.INSTRUCTOR_CODE}`.trim(),
        icon: 'visibility',
        iconType: 'detail',
        dividerAfter: true,
        action: () => this.openDetailModal(item),
      },
      {
        id: 'delete',
        label: 'ลบข้อมูลอาจารย์',
        sublabel: isScheduled ? `ติดตารางสอน ${item.SCHEDULE_COUNT} คาบ (ลบไม่ได้)` : 'นำออกจากภาคเรียนนี้',
        icon: 'delete',
        iconType: 'delete',
        variant: 'danger',
        disabled: isScheduled,
        action: () => this.deleteInstructor(item),
      },
    ];

    return items;
  });

  onRowContextMenu(event: MouseEvent, item: ScheduleInstructorItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedContextMenuInstructor.set(item);
    this.contextMenuPos.set({ x: event.clientX, y: event.clientY });
    this.isContextMenuOpen.set(true);
  }

  openMenuFromBtn(event: MouseEvent, item: ScheduleInstructorItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedContextMenuInstructor.set(item);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.contextMenuPos.set({ x: rect.left, y: rect.bottom + 4 });
    this.isContextMenuOpen.set(true);
  }

  // Active Semester State
  readonly activeYear = signal<string>('');
  readonly activeSemester = signal<string>('');

  // Filter State
  readonly selectedFacultyNo = signal<string>('');
  readonly searchQuery = signal<string>('');

  // Main Instructors Table Data
  readonly instructorList = signal<ScheduleInstructorItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isBulkDeleting = signal<boolean>(false);

  // Checkbox Selection for Bulk Delete
  readonly selectedCodes = signal<string[]>([]);

  // Detail Modal State (View Single Instructor)
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedInstructorDetail = signal<ScheduleInstructorItem | null>(null);

  // Master Faculties Lookup
  readonly faculties = signal<FacultyOption[]>([]);
  readonly isFacultiesLoading = signal<boolean>(false);

  // Modal State (Add Instructors)
  readonly isModalOpen = signal<boolean>(false);
  readonly masterInstructors = signal<MasterInstructorOption[]>([]);
  readonly isMasterLoading = signal<boolean>(false);
  readonly modalSearchQuery = signal<string>('');
  readonly modalFacultyFilter = signal<string>('');
  readonly selectedMasterCodes = signal<string[]>([]);
  formError: string = '';

  // Options for Faculty Select Component
  readonly facultySelectOptions = computed<SelectOption[]>(() => {
    const list = this.faculties();
    const options: SelectOption[] = [{ value: '', label: 'ทุกคณะ / ไม่ระบุ', icon: 'domain' }];
    list.forEach((f) => {
      options.push({
        value: f.FACULTY_NO,
        label: f.FACULTY_NAME_THAI || f.FACULTY_NO,
        badge: f.FACULTY_NAME_SHORT || undefined,
        icon: 'account_balance',
      });
    });
    return options;
  });

  // Modal Faculty Select Options
  readonly modalFacultySelectOptions = computed<SelectOption[]>(() => {
    const list = this.faculties();
    const options: SelectOption[] = [{ value: '', label: 'ทุกคณะ' }];
    list.forEach((f) => {
      options.push({
        value: f.FACULTY_NO,
        label: f.FACULTY_NAME_THAI || f.FACULTY_NO,
        badge: f.FACULTY_NAME_SHORT || undefined,
      });
    });
    return options;
  });

  // Filtered Main Table List
  readonly filteredInstructors = computed(() => {
    const list = this.instructorList();
    const q = this.searchQuery().trim().toLowerCase();
    const fac = this.selectedFacultyNo();

    return list.filter((item) => {
      const matchFac = !fac || (item.FACULTY_NO && item.FACULTY_NO.trim() === fac.trim());
      if (!matchFac) return false;

      if (!q) return true;

      const codeMatch = item.INSTRUCTOR_CODE.toLowerCase().includes(q);
      const thMatch = (item.INSTRUCTOR_NAME_THAI || '').toLowerCase().includes(q);
      const engMatch = (item.INSTRUCTOR_NAME_ENG || '').toLowerCase().includes(q);
      const rankMatch = (item.RANK_NAME_THAI_S || '').toLowerCase().includes(q);
      const facMatch = (item.FACULTY_NAME_THAI || '').toLowerCase().includes(q);

      return codeMatch || thMatch || engMatch || rankMatch || facMatch;
    });
  });

  // Pagination State (10 items per page)
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly totalItems = computed(() => this.filteredInstructors().length);
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

  readonly paginatedInstructors = computed(() => {
    const list = this.filteredInstructors();
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

  // Filtered Master List for Modal Picker
  readonly filteredMasterInstructors = computed(() => {
    const list = this.masterInstructors();
    const q = this.modalSearchQuery().trim().toLowerCase();
    const fac = this.modalFacultyFilter();

    return list.filter((m) => {
      const matchFac = !fac || (m.FACULTY_NO && m.FACULTY_NO.trim() === fac.trim());
      if (!matchFac) return false;

      if (!q) return true;

      const codeMatch = m.INSTRUCTOR_CODE.toLowerCase().includes(q);
      const thMatch = (m.INSTRUCTOR_NAME_THAI || '').toLowerCase().includes(q);
      const engMatch = (m.INSTRUCTOR_NAME_ENG || '').toLowerCase().includes(q);
      const rankMatch = (m.RANK_NAME_THAI_S || '').toLowerCase().includes(q);
      const facMatch = (m.FACULTY_NAME_THAI || '').toLowerCase().includes(q);

      return codeMatch || thMatch || engMatch || rankMatch || facMatch;
    });
  });

  // Progressive Chunking for Add Instructors Modal (Prevent DOM lag/freeze)
  readonly modalDisplayLimit = signal<number>(40);

  readonly displayedMasterInstructors = computed(() => {
    return this.filteredMasterInstructors().slice(0, this.modalDisplayLimit());
  });

  loadMoreMaster(): void {
    this.modalDisplayLimit.update((limit) => limit + 40);
  }

  showAllMaster(): void {
    this.modalDisplayLimit.set(this.filteredMasterInstructors().length);
  }

  onModalSearch(q: string): void {
    this.modalSearchQuery.set(q);
    this.modalDisplayLimit.set(40);
  }

  onModalFaculty(fac: string): void {
    this.modalFacultyFilter.set(fac);
    this.modalDisplayLimit.set(40);
  }

  // Selected Master Items (Objects for preview chips)
  readonly selectedMasterItems = computed(() => {
    const codes = new Set(this.selectedMasterCodes());
    return this.masterInstructors().filter((m) => codes.has(m.INSTRUCTOR_CODE));
  });

  // Master Checkbox State
  readonly deletableInstructors = computed(() => {
    return this.filteredInstructors().filter((item) => !item.IS_SCHEDULED);
  });

  readonly isAllSelected = computed(() => {
    const deletable = this.deletableInstructors();
    if (deletable.length === 0) return false;
    const selectedSet = new Set(this.selectedCodes());
    return deletable.every((item) => selectedSet.has(item.INSTRUCTOR_CODE));
  });

  private getBaseUrl(): string {
    return '/api/service/instructor';
  }

  ngOnInit(): void {
    this.loadActiveSemesterAndData();
    this.loadFaculties();
  }

  // Load Active Year/Semester, then load Instructor List
  loadActiveSemesterAndData(): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; results: { STUDY_YEAR: string; STUDY_SEMESTER: string } | null }>('/api/service/yearsem/active').subscribe({
      next: (res) => {
        if (res && res.results) {
          this.activeYear.set(res.results.STUDY_YEAR);
          this.activeSemester.set(res.results.STUDY_SEMESTER);
        }
        this.loadInstructorList();
      },
      error: (err) => {
        console.error('Error fetching active yearsem', err);
        this.loadInstructorList();
      },
    });
  }

  // Load Main Table Instructors
  loadInstructorList(): void {
    this.isLoading.set(true);
    this.selectedCodes.set([]);

    const year = this.activeYear();
    const sem = this.activeSemester();

    let url = `${this.getBaseUrl()}/list?year=${year}&semester=${sem}`;
    if (this.selectedFacultyNo()) {
      url += `&facultyNo=${encodeURIComponent(this.selectedFacultyNo())}`;
    }

    this.http.get<{ success: boolean; results: ScheduleInstructorItem[] }>(url).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success) {
          this.instructorList.set(res.results || []);
        } else {
          this.instructorList.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err?.message || 'ไม่สามารถโหลดรายชื่ออาจารย์ผู้สอนได้');
      },
    });
  }

  // Load Faculties for dropdown
  loadFaculties(): void {
    this.isFacultiesLoading.set(true);
    this.http.get<{ success: boolean; results: FacultyOption[] }>('/api/service/curriculum/faculties').subscribe({
      next: (res) => {
        this.isFacultiesLoading.set(false);
        if (res && res.success) {
          this.faculties.set(res.results || []);
        }
      },
      error: () => {
        this.isFacultiesLoading.set(false);
      },
    });
  }

  // Load Master Instructors from UGB_INSTRUCTOR
  loadMasterInstructors(): void {
    this.isMasterLoading.set(true);
    this.http.get<{ success: boolean; results: MasterInstructorOption[] }>(`${this.getBaseUrl()}/master-list`).subscribe({
      next: (res) => {
        this.isMasterLoading.set(false);
        if (res && res.success) {
          this.masterInstructors.set(res.results || []);
        }
      },
      error: (err) => {
        this.isMasterLoading.set(false);
        this.toastService.error(err?.message || 'ไม่สามารถโหลดข้อมูลอาจารย์ได้');
      },
    });
  }

  // Filter change handlers
  onFacultyChange(facultyNo: string): void {
    this.selectedFacultyNo.set(facultyNo);
    this.selectedCodes.set([]);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  // Table Checkbox handlers
  toggleSelectAll(): void {
    const deletable = this.deletableInstructors();
    if (this.isAllSelected()) {
      this.selectedCodes.set([]);
    } else {
      this.selectedCodes.set(deletable.map((item) => item.INSTRUCTOR_CODE));
    }
  }

  toggleSelectRow(code: string): void {
    const current = this.selectedCodes();
    if (current.includes(code)) {
      this.selectedCodes.set(current.filter((c) => c !== code));
    } else {
      this.selectedCodes.set([...current, code]);
    }
  }

  isRowSelected(code: string): boolean {
    return this.selectedCodes().includes(code);
  }

  // Delete Individual Instructor
  async deleteInstructor(item: ScheduleInstructorItem): Promise<void> {
    const nameDisplay = `${item.RANK_NAME_THAI_S || ''} ${item.INSTRUCTOR_NAME_THAI || item.INSTRUCTOR_CODE}`.trim();

    if (item.IS_SCHEDULED || (item.SCHEDULE_COUNT && item.SCHEDULE_COUNT > 0)) {
      this.toastService.error(
        `ไม่สามารถลบอาจารย์ "${nameDisplay}" ได้ เนื่องจากถูกจัดลงในตารางสอนแล้ว (${item.SCHEDULE_COUNT} คาบ) กรุณาลบตารางสอนของอาจารย์ก่อน`,
        'ไม่สามารถลบได้'
      );
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการลบอาจารย์',
      message: `คุณต้องการลบอาจารย์ "${nameDisplay}" ออกจากตารางปี ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER} ใช่หรือไม่?`,
      detail: 'ระบบจะสำรองประวัติการลบไว้ในตาราง HIS ให้อัตโนมัติ',
      confirmText: 'ลบอาจารย์ท่านนี้',
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });

    if (!confirmed) return;

    const payload = {
      studyYear: item.STUDY_YEAR,
      studySemester: item.STUDY_SEMESTER,
      instructorCode: item.INSTRUCTOR_CODE,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string }>(`${this.getBaseUrl()}/delete`, payload).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toastService.success(`ลบอาจารย์ "${nameDisplay}" สำเร็จ`);
          this.loadInstructorList();
        } else {
          this.toastService.error(res?.message || 'ลบไม่สำเร็จ');
        }
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || err?.message || 'ลบไม่สำเร็จ');
      },
    });
  }

  // Bulk Delete Selected Instructors
  async deleteBulk(): Promise<void> {
    const selected = this.selectedCodes();
    if (selected.length === 0) return;

    // ตรวจสอบว่ามีอาจารย์ที่ติดตารางสอนอยู่หรือไม่
    const scheduledSelected = this.instructorList().filter(
      (inst) => selected.includes(inst.INSTRUCTOR_CODE) && inst.IS_SCHEDULED
    );

    if (scheduledSelected.length > 0) {
      const names = scheduledSelected.map((s) => s.INSTRUCTOR_NAME_THAI || s.INSTRUCTOR_CODE).join(', ');
      this.toastService.error(
        `ไม่สามารถลบได้ เนื่องจากมีอาจารย์ ${scheduledSelected.length} ท่านถูกจัดลงในตารางสอนแล้ว: ${names}`,
        'ไม่สามารถลบได้'
      );
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการลบแบบกลุ่ม',
      message: `คุณต้องการลบอาจารย์ผู้สอนที่เลือกจำนวน ${selected.length} ท่าน ใช่หรือไม่?`,
      detail: 'ระบบจะสำรองประวัติการลบไว้ในตาราง HIS ให้อัตโนมัติ',
      confirmText: `ลบ ${selected.length} ท่าน`,
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });

    if (!confirmed) return;

    this.isBulkDeleting.set(true);
    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      instructorCodes: selected,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string; deletedCount?: number }>(`${this.getBaseUrl()}/delete-bulk`, payload).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        if (res && res.success) {
          this.toastService.success(`ลบอาจารย์ ${selected.length} ท่าน สำเร็จ`);
          this.selectedCodes.set([]);
          this.loadInstructorList();
        } else {
          this.toastService.error(res?.message || 'ลบไม่สำเร็จ');
        }
      },
      error: (err) => {
        this.isBulkDeleting.set(false);
        this.toastService.error(err?.error?.message || err?.message || 'ลบไม่สำเร็จ');
      },
    });
  }

  // ============================================================
  // Modal Handlers (Add Instructors)
  // ============================================================
  openAddModal(): void {
    this.formError = '';
    this.modalSearchQuery.set('');
    this.modalFacultyFilter.set('');
    this.modalDisplayLimit.set(40);
    this.selectedMasterCodes.set([]);
    this.isModalOpen.set(true);

    if (this.masterInstructors().length === 0) {
      this.loadMasterInstructors();
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.formError = '';
    this.selectedMasterCodes.set([]);
  }

  toggleMasterSelect(code: string): void {
    const current = this.selectedMasterCodes();
    if (current.includes(code)) {
      this.selectedMasterCodes.set(current.filter((c) => c !== code));
    } else {
      this.selectedMasterCodes.set([...current, code]);
    }
  }

  isMasterSelected(code: string): boolean {
    return this.selectedMasterCodes().includes(code);
  }

  removeMasterSelect(code: string): void {
    this.selectedMasterCodes.set(this.selectedMasterCodes().filter((c) => c !== code));
  }

  clearSelectedMaster(): void {
    this.selectedMasterCodes.set([]);
  }

  // Check if instructor already exists in main table
  isAlreadyAdded(code: string): boolean {
    return this.instructorList().some((item) => item.INSTRUCTOR_CODE === code);
  }

  // Save selected instructors to DB
  saveScheduleInstructors(): void {
    const codes = this.selectedMasterCodes();
    if (codes.length === 0) {
      this.formError = 'กรุณาเลือกอาจารย์ผู้สอนอย่างน้อย 1 ท่าน';
      return;
    }

    this.formError = '';
    this.isSaving.set(true);

    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      instructorCodes: codes,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string; insertedCount?: number }>(`${this.getBaseUrl()}/add`, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res && res.success) {
          this.toastService.success(res.message || 'เพิ่มอาจารย์ผู้สอนเรียบร้อยแล้ว');
          this.closeModal();
          this.loadInstructorList();
        } else {
          this.formError = res?.message || 'เกิดข้อผิดพลาดในการบันทึก';
          this.toastService.error(this.formError);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formError = err?.error?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึก';
        this.toastService.error(this.formError);
      },
    });
  }

  // ============================================================
  // Single Instructor Detail Modal Handlers
  // ============================================================
  openDetailModal(item: ScheduleInstructorItem): void {
    this.selectedInstructorDetail.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedInstructorDetail.set(null);
  }

  // Format Instructor Type
  getInstructorTypeLabel(type?: string): string {
    switch (type) {
      case '1':
        return 'อาจารย์ประจำ';
      case '2':
        return 'อาจารย์พิเศษ';
      case '3':
        return 'ผู้บริหาร';
      default:
        return 'ทั่วไป';
    }
  }

  getInstructorTypeClass(type?: string): string {
    switch (type) {
      case '1':
        return 'type-permanent';
      case '2':
        return 'type-special';
      case '3':
        return 'type-exec';
      default:
        return 'type-default';
    }
  }

  // Get Cartoon Avatar based on gender (male left, female right)
  getInstructorAvatar(d: ScheduleInstructorItem | null): string {
    if (!d) return 'images/avatar-teacher-male.png';

    const sex = (d.INSTRUCTOR_SEX || '').toString().trim().toUpperCase();
    if (sex === 'F' || sex === '2' || sex === 'FEMALE' || sex === 'หญิง' || sex === 'W') {
      return 'images/avatar-teacher-female.png';
    }
    if (sex === 'M' || sex === '1' || sex === 'MALE' || sex === 'ชาย') {
      return 'images/avatar-teacher-male.png';
    }

    const fullStr = `${d.INSTRUCTOR_NAME_THAI || ''} ${d.RANK_NAME_THAI_L || ''} ${d.RANK_NAME_THAI_S || ''} ${d.INSTRUCTOR_NAME_ENG || ''}`;
    if (
      fullStr.includes('นางสาว') ||
      fullStr.includes('นาง') ||
      fullStr.includes('น.ส.') ||
      fullStr.includes('Miss') ||
      fullStr.includes('Ms.') ||
      fullStr.includes('Mrs.') ||
      fullStr.includes('(ญ)')
    ) {
      return 'images/avatar-teacher-female.png';
    }

    return 'images/avatar-teacher-male.png';
  }
}
