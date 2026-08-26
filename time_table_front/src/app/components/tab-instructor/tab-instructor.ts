import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../common/custom-select/custom-select';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { OnboardingTourService } from '../../services/onboarding-tour.service';

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
  FLAG_DISPLAY?: string;
  PERSONAL_ID?: string;
  INSERT_DATE?: string;
  USER_INSERT?: string;
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
  FLAG_DISPLAY?: string;
  PERSONAL_ID?: string;
}

export interface FacultyOption {
  FACULTY_NO: string;
  FACULTY_NAME_THAI: string;
  FACULTY_NAME_SHORT?: string;
}

@Component({
  selector: 'app-tab-instructor',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-instructor.html',
  styleUrl: './tab-instructor.css',
})
export class TabInstructorComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly tourService = inject(OnboardingTourService);

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
        label: `${f.FACULTY_NO} - ${f.FACULTY_NAME_THAI}`,
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
        label: `${f.FACULTY_NO} - ${f.FACULTY_NAME_THAI}`,
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

  // Selected Master Items (Objects for preview chips)
  readonly selectedMasterItems = computed(() => {
    const codes = new Set(this.selectedMasterCodes());
    return this.masterInstructors().filter((m) => codes.has(m.INSTRUCTOR_CODE));
  });

  // Master Checkbox State
  readonly isAllSelected = computed(() => {
    const visible = this.filteredInstructors();
    if (visible.length === 0) return false;
    const selectedSet = new Set(this.selectedCodes());
    return visible.every((item) => selectedSet.has(item.INSTRUCTOR_CODE));
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
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // Table Checkbox handlers
  toggleSelectAll(): void {
    const visible = this.filteredInstructors();
    if (this.isAllSelected()) {
      this.selectedCodes.set([]);
    } else {
      this.selectedCodes.set(visible.map((item) => item.INSTRUCTOR_CODE));
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
  deleteInstructor(item: ScheduleInstructorItem): void {
    const nameDisplay = `${item.RANK_NAME_THAI_S || ''} ${item.INSTRUCTOR_NAME_THAI || item.INSTRUCTOR_CODE}`.trim();
    if (!confirm(`คุณต้องการลบอาจารย์ "${nameDisplay}" ออกจากปี ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER} หรือไม่?\n(ระบบจะสำรองประวัติการลบไว้)`)) {
      return;
    }

    const payload = {
      studyYear: item.STUDY_YEAR,
      studySemester: item.STUDY_SEMESTER,
      instructorCode: item.INSTRUCTOR_CODE,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string }>(`${this.getBaseUrl()}/delete`, payload).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toastService.success(`ลบอาจารย์ "${nameDisplay}" เรียบร้อยแล้ว`, 'ลบสำเร็จ');
          this.loadInstructorList();
        } else {
          this.toastService.error(res?.message || 'เกิดข้อผิดพลาดในการลบ');
        }
      },
      error: (err) => {
        this.toastService.error(err?.message || 'เกิดข้อผิดพลาดในการลบ');
      },
    });
  }

  // Bulk Delete Selected Instructors
  deleteBulk(): void {
    const selected = this.selectedCodes();
    if (selected.length === 0) return;

    if (!confirm(`คุณต้องการลบอาจารย์ผู้สอนที่เลือกจำนวน ${selected.length} ท่าน หรือไม่?\n(ระบบจะสำรองประวัติการลบไว้)`)) {
      return;
    }

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
          this.toastService.success(res.message || `ลบอาจารย์ ${selected.length} ท่าน เรียบร้อยแล้ว`, 'ลบสำเร็จ');
          this.selectedCodes.set([]);
          this.loadInstructorList();
        } else {
          this.toastService.error(res?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      },
      error: (err) => {
        this.isBulkDeleting.set(false);
        this.toastService.error(err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
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
}
