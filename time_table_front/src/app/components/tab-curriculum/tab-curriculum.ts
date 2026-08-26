import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../common/custom-select/custom-select';
import { ToastService } from '../../services/toast.service';
import { OnboardingTourService } from '../../services/onboarding-tour.service';

export interface FacultyItem {
  FACULTY_NO: string;
  FACULTY_NAME_THAI: string;
  FACULTY_NAME_SHORT?: string;
  FACULTY_NAME_ENG?: string;
}

export interface ProgramGroupItem {
  FACULTY_NO: string;
  GROUP_NO: string;
  GROUP_NAME: string;
}

export interface ProgramSubGroupItem {
  FACULTY_NO: string;
  GROUP_NO: string;
  SUB_GROUP_NO: string;
  SUB_GROUP_NAME: string;
}

export interface CurriculumCourseRow {
  FACULTY_NO: string;
  GROUP_NO: string;
  SUB_GROUP_NO?: string;
  YEAR_LEVEL: string;
  SEMESTER: string;
  COURSE_NO: string;
  YEAR_ENROLL?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  GROUP_NAME?: string;
  SUB_GROUP_NAME?: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG_L?: string;
  CREDIT?: number;
}

export interface UgbCourseOption {
  COURSE_NO: string;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
}

@Component({
  selector: 'app-tab-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-curriculum.html',
  styleUrl: './tab-curriculum.css',
})
export class TabCurriculumComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly tourService = inject(OnboardingTourService);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Master Data Signals
  readonly facultiesList = signal<FacultyItem[]>([]);
  readonly groupsList = signal<ProgramGroupItem[]>([]);
  readonly subGroupsList = signal<ProgramSubGroupItem[]>([]);

  // Main Table Records
  readonly curriculumCourses = signal<CurriculumCourseRow[]>([]);

  // Main Table Filters
  readonly filterFaculty = signal<string>('ALL');
  readonly filterGroup = signal<string>('ALL');
  readonly filterSubGroup = signal<string>('ALL');
  readonly filterYearLevel = signal<string>('ALL');
  readonly filterSemester = signal<string>('ALL');

  // Main Table Multi-Selection for Bulk Delete
  readonly selectedKeys = signal<string[]>([]);
  readonly selectedCount = computed(() => this.selectedKeys().length);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly showAddCoursePicker = signal<boolean>(false);
  readonly existingCurriculumCourses = signal<CurriculumCourseRow[]>([]);
  readonly isExistingLoading = signal<boolean>(false);
  readonly hasQueriedExisting = signal<boolean>(false);
  formError: string = '';

  // Modal Form Controls
  modalFacultyNo: string = '';
  modalGroupNo: string = '';
  modalSubGroupNo: string = '00';
  modalYearLevel: string = '1';
  modalSemester: string = '1';

  // Modal Cascading Data
  readonly modalGroupsList = signal<ProgramGroupItem[]>([]);
  readonly modalSubGroupsList = signal<ProgramSubGroupItem[]>([]);

  // Modal Selected Courses for Batch Insertion
  readonly selectedCourses = signal<UgbCourseOption[]>([]);
  readonly selectedCoursesCount = computed(() => this.selectedCourses().length);

  // Modal Course Picker (3-Level Search from UGB_COURSE)
  readonly availableLetters = signal<string[]>([]);
  readonly isLettersLoading = signal<boolean>(false);
  readonly selectedLetter = signal<string | null>(null);

  readonly prefixGroups = signal<string[]>([]);
  readonly isPrefixesLoading = signal<boolean>(false);
  readonly selectedPrefix = signal<string | null>(null);

  readonly ugbCourses = signal<UgbCourseOption[]>([]);
  readonly isUgbCoursesLoading = signal<boolean>(false);

  readonly pickerCodeQuery = signal<string>('');
  readonly pickerNameQuery = signal<string>('');

  // Options for Year Level & Semester
  readonly yearLevelOptions: SelectOption[] = [
    { value: 'ALL', label: 'ทุกชั้นปี' },
    { value: '1', label: 'ชั้นปี 1' },
    { value: '2', label: 'ชั้นปี 2' },
    { value: '3', label: 'ชั้นปี 3' },
    { value: '4', label: 'ชั้นปี 4' },
  ];

  readonly modalYearLevelOptions: SelectOption[] = [
    { value: '1', label: 'ชั้นปี 1' },
    { value: '2', label: 'ชั้นปี 2' },
    { value: '3', label: 'ชั้นปี 3' },
    { value: '4', label: 'ชั้นปี 4' },
  ];

  readonly semesterOptions: SelectOption[] = [
    { value: 'ALL', label: 'ทุกภาค' },
    { value: '1', label: 'ภาค 1' },
    { value: '2', label: 'ภาค 2' },
  ];

  readonly modalSemesterOptions: SelectOption[] = [
    { value: '1', label: 'ภาค 1' },
    { value: '2', label: 'ภาค 2' },
  ];

  // Faculty Select Options for Filter
  readonly facultyFilterOptions = computed<SelectOption[]>(() => {
    const list = this.facultiesList();
    const opts: SelectOption[] = [{ value: 'ALL', label: 'คณะ — ทั้งหมด' }];
    for (const f of list) {
      opts.push({
        value: f.FACULTY_NO,
        label: `${f.FACULTY_NO} - ${f.FACULTY_NAME_THAI}`,
        subLabel: f.FACULTY_NAME_ENG,
      });
    }
    return opts;
  });

  // Group Select Options for Filter
  readonly groupFilterOptions = computed<SelectOption[]>(() => {
    const list = this.groupsList();
    const opts: SelectOption[] = [{ value: 'ALL', label: 'กลุ่มวิชา — ทั้งหมด' }];
    for (const g of list) {
      opts.push({
        value: g.GROUP_NO,
        label: `${g.GROUP_NO} - ${g.GROUP_NAME}`,
      });
    }
    return opts;
  });

  // Modal Faculty Options
  readonly modalFacultyOptions = computed<SelectOption[]>(() => {
    const list = this.facultiesList();
    return list.map((f) => ({
      value: f.FACULTY_NO,
      label: `${f.FACULTY_NO} - ${f.FACULTY_NAME_THAI}`,
    }));
  });

  // Modal Group Options
  readonly modalGroupOptions = computed<SelectOption[]>(() => {
    const list = this.modalGroupsList();
    return list.map((g) => ({
      value: g.GROUP_NO,
      label: `${g.GROUP_NO} - ${g.GROUP_NAME}`,
    }));
  });

  // Modal SubGroup Options
  readonly modalSubGroupOptions = computed<SelectOption[]>(() => {
    const list = this.modalSubGroupsList();
    const opts: SelectOption[] = [{ value: '00', label: 'กลุ่มหลัก (ไม่มีกลุ่มย่อย)' }];
    for (const sg of list) {
      opts.push({
        value: sg.SUB_GROUP_NO,
        label: `${sg.SUB_GROUP_NO} - ${sg.SUB_GROUP_NAME}`,
      });
    }
    return opts;
  });

  // Filtered UGB courses in modal picker
  readonly filteredUgbCourses = computed(() => {
    const codeQ = this.pickerCodeQuery().trim().toLowerCase();
    const nameQ = this.pickerNameQuery().trim().toLowerCase();
    const list = this.ugbCourses();

    if (!codeQ && !nameQ) return list;

    return list.filter((c) => {
      const matchCode = !codeQ || c.COURSE_NO.toLowerCase().includes(codeQ);
      const matchName =
        !nameQ ||
        (c.COURSE_NAME_THAI && c.COURSE_NAME_THAI.toLowerCase().includes(nameQ)) ||
        (c.COURSE_NAME_ENG_L && c.COURSE_NAME_ENG_L.toLowerCase().includes(nameQ));
      return matchCode && matchName;
    });
  });

  // Filtered Main Table Courses
  readonly filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const fac = this.filterFaculty();
    const grp = this.filterGroup();
    const sub = this.filterSubGroup();
    const yr = this.filterYearLevel();
    const sem = this.filterSemester();
    const list = this.curriculumCourses();

    return list.filter((row) => {
      if (fac !== 'ALL' && row.FACULTY_NO !== fac) return false;
      if (grp !== 'ALL' && row.GROUP_NO !== grp) return false;
      if (sub !== 'ALL' && (row.SUB_GROUP_NO || '00') !== sub) return false;
      if (yr !== 'ALL' && row.YEAR_LEVEL !== yr) return false;
      if (sem !== 'ALL' && row.SEMESTER !== sem) return false;

      if (q) {
        const matchCourse = row.COURSE_NO.toLowerCase().includes(q);
        const matchTh = row.COURSE_NAME_THAI?.toLowerCase().includes(q);
        const matchEn = row.COURSE_NAME_ENG_L?.toLowerCase().includes(q);
        const matchFac = row.FACULTY_NAME_THAI?.toLowerCase().includes(q);
        const matchGrp = row.GROUP_NAME?.toLowerCase().includes(q);
        const matchSub = row.SUB_GROUP_NAME?.toLowerCase().includes(q);
        if (!matchCourse && !matchTh && !matchEn && !matchFac && !matchGrp && !matchSub) {
          return false;
        }
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadFaculties();
    this.loadFirstLetters();
    this.loadCurriculumList();
  }

  private getBaseUrl(): string {
    return '/api/service';
  }

  // Load Faculties from UGB_FACULTY
  loadFaculties(): void {
    this.http.get<{ success: boolean; results: FacultyItem[] }>(`${this.getBaseUrl()}/curriculum/faculties`).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.results)) {
          this.facultiesList.set(res.results);
          if (res.results.length > 0 && !this.modalFacultyNo) {
            this.modalFacultyNo = res.results[0].FACULTY_NO;
            this.onModalFacultyChange(this.modalFacultyNo);
          }
        }
      },
    });
  }

  // Load Groups for Filter
  onFilterFacultyChange(facNo: string): void {
    this.filterFaculty.set(facNo);
    this.filterGroup.set('ALL');
    this.filterSubGroup.set('ALL');

    if (facNo && facNo !== 'ALL') {
      this.http
        .get<{ success: boolean; results: ProgramGroupItem[] }>(`${this.getBaseUrl()}/curriculum/groups/${facNo}`)
        .subscribe({
          next: (res) => {
            if (res && res.success && Array.isArray(res.results)) {
              this.groupsList.set(res.results);
            }
          },
        });
    } else {
      this.groupsList.set([]);
      this.subGroupsList.set([]);
    }
  }

  // Load Main Curriculum Courses List
  loadCurriculumList(): void {
    this.isLoading.set(true);
    this.selectedKeys.set([]);

    this.http.get<{ success: boolean; results: CurriculumCourseRow[] }>(`${this.getBaseUrl()}/curriculum/list`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success && Array.isArray(res.results)) {
          this.curriculumCourses.set(res.results);
        } else {
          this.curriculumCourses.set([]);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.curriculumCourses.set([]);
      },
    });
  }

  // Row Unique Key Identifier
  getRowKey(row: CurriculumCourseRow): string {
    return `${row.FACULTY_NO}_${row.GROUP_NO}_${row.SUB_GROUP_NO || '00'}_${row.YEAR_LEVEL}_${row.SEMESTER}_${row.COURSE_NO}`;
  }

  isRowSelected(row: CurriculumCourseRow): boolean {
    return this.selectedKeys().includes(this.getRowKey(row));
  }

  toggleRowSelect(row: CurriculumCourseRow): void {
    const key = this.getRowKey(row);
    const list = this.selectedKeys();
    if (list.includes(key)) {
      this.selectedKeys.set(list.filter((k) => k !== key));
    } else {
      this.selectedKeys.set([...list, key]);
    }
  }

  isAllSelected(): boolean {
    const visible = this.filteredCourses();
    if (visible.length === 0) return false;
    const set = new Set(this.selectedKeys());
    return visible.every((r) => set.has(this.getRowKey(r)));
  }

  toggleSelectAll(): void {
    const visible = this.filteredCourses();
    if (visible.length === 0) return;

    if (this.isAllSelected()) {
      const visibleKeys = new Set(visible.map((r) => this.getRowKey(r)));
      this.selectedKeys.set(this.selectedKeys().filter((k) => !visibleKeys.has(k)));
    } else {
      const current = [...this.selectedKeys()];
      const set = new Set(current);
      for (const r of visible) {
        const k = this.getRowKey(r);
        if (!set.has(k)) {
          current.push(k);
          set.add(k);
        }
      }
      this.selectedKeys.set(current);
    }
  }

  // ============================================================
  // Modal Handlers & Cascading Lookups (เพิ่ม/จัดการวิชาในหลักสูตร)
  // ============================================================
  openAddModal(): void {
    this.formError = '';
    this.showAddCoursePicker.set(false);
    this.existingCurriculumCourses.set([]);
    this.hasQueriedExisting.set(false);
    this.selectedCourses.set([]);
    this.pickerCodeQuery.set('');
    this.pickerNameQuery.set('');

    const faculties = this.facultiesList();
    if (faculties.length > 0 && !this.modalFacultyNo) {
      this.modalFacultyNo = faculties[0].FACULTY_NO;
    }

    if (this.modalFacultyNo) {
      this.onModalFacultyChange(this.modalFacultyNo);
    }

    this.isModalOpen.set(true);

    // Auto-trigger tutorial on first visit when modal opens
    if (!this.tourService.isTourCompleted('modal_curriculum_tour')) {
      setTimeout(() => {
        this.startModalTour(false);
      }, 300);
    }
  }

  // Trigger Modal Tour for Add/Manage Curriculum Courses
  startModalTour(force: boolean = false): void {
    const steps = [
      {
        targetSelector: '.modal-form-grid',
        title: '1. เลือกเงื่อนไขหลักสูตร',
        description: 'เลือก คณะ, กลุ่มสาขาวิชา, กลุ่มวิชาย่อย (ถ้ามี), ชั้นปี (1-4) และภาคเรียน (1-2) ที่ต้องการจัดการ',
        icon: 'account_balance',
        position: 'bottom' as const,
      },
      {
        targetSelector: '.btn-outline-action',
        title: '2. แสดงรายวิชาในหลักสูตร',
        description: 'คลิกปุ่มนี้เพื่อดึงรายชื่อวิชาที่มีอยู่ในหลักสูตรตามเงื่อนไขที่เลือกไว้ ณ ปัจจุบันมาตรวจสอบ',
        icon: 'list_alt',
        position: 'top' as const,
      },
      {
        targetSelector: '.btn-primary-action',
        title: '3. ค้นหาและเพิ่มวิชา',
        description: 'คลิกปุ่มนี้เพื่อเปิดแผงค้นหารายวิชาจากฐานข้อมูล UGB_COURSE โดยสามารถเลือกตามหมวดตัวอักษรหรือพิมพ์ค้นหาได้ทันที',
        icon: 'add_circle',
        position: 'top' as const,
      },
      {
        targetSelector: '.modal-footer .btn-primary, .modal-footer',
        title: '4. บันทึกวิชาในหลักสูตร',
        description: 'เมื่อเลือกวิชาที่ต้องการครบแล้ว กดปุ่มบันทึกข้อมูล โดยระบบจะช่วยตรวจสอบวิชาที่ซ้ำให้อัตโนมัติ',
        icon: 'save',
        position: 'top' as const,
        actionHint: 'แตะที่ใดก็ได้บนหน้าจอเพื่อเริ่มใช้งาน',
      },
    ];
    this.tourService.startTour('modal_curriculum_tour', steps, force);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.showAddCoursePicker.set(false);
    this.formError = '';
  }

  // When Modal Faculty changes -> Fetch Groups
  onModalFacultyChange(facNo: string): void {
    this.modalFacultyNo = facNo;
    this.modalGroupNo = '';
    this.modalSubGroupNo = '00';
    this.hasQueriedExisting.set(false);
    this.existingCurriculumCourses.set([]);

    if (facNo) {
      this.http
        .get<{ success: boolean; results: ProgramGroupItem[] }>(`${this.getBaseUrl()}/curriculum/groups/${facNo}`)
        .subscribe({
          next: (res) => {
            if (res && res.success && Array.isArray(res.results)) {
              this.modalGroupsList.set(res.results);
              if (res.results.length > 0) {
                this.modalGroupNo = res.results[0].GROUP_NO;
                this.onModalGroupChange(this.modalGroupNo);
              }
            } else {
              this.modalGroupsList.set([]);
              this.modalSubGroupsList.set([]);
            }
          },
        });
    }
  }

  // When Modal Group changes -> Fetch SubGroups
  onModalGroupChange(grpNo: string): void {
    this.modalGroupNo = grpNo;
    this.modalSubGroupNo = '00';
    this.hasQueriedExisting.set(false);
    this.existingCurriculumCourses.set([]);

    if (this.modalFacultyNo && grpNo) {
      this.http
        .get<{ success: boolean; results: ProgramSubGroupItem[] }>(
          `${this.getBaseUrl()}/curriculum/sub-groups/${this.modalFacultyNo}/${grpNo}`
        )
        .subscribe({
          next: (res) => {
            if (res && res.success && Array.isArray(res.results)) {
              this.modalSubGroupsList.set(res.results);
            } else {
              this.modalSubGroupsList.set([]);
            }
          },
        });
    }
  }

  // Button: "แสดงวิชา" (Load existing courses for selected criteria)
  loadExistingCoursesForModal(): void {
    if (!this.modalFacultyNo || !this.modalGroupNo) {
      this.formError = 'กรุณาเลือกคณะ และกลุ่มวิชาก่อนกดแสดงวิชา';
      return;
    }

    this.formError = '';
    this.isExistingLoading.set(true);
    this.hasQueriedExisting.set(true);

    const params = new URLSearchParams({
      facultyNo: this.modalFacultyNo,
      groupNo: this.modalGroupNo,
      subGroupNo: this.modalSubGroupNo || '00',
      yearLevel: this.modalYearLevel,
      semester: this.modalSemester,
    });

    this.http
      .get<{ success: boolean; results: CurriculumCourseRow[] }>(
        `${this.getBaseUrl()}/curriculum/list?${params.toString()}`
      )
      .subscribe({
        next: (res) => {
          this.isExistingLoading.set(false);
          if (res && res.success && Array.isArray(res.results)) {
            this.existingCurriculumCourses.set(res.results);
          } else {
            this.existingCurriculumCourses.set([]);
          }
        },
        error: () => {
          this.isExistingLoading.set(false);
          this.existingCurriculumCourses.set([]);
        },
      });
  }

  // Button: "เพิ่มวิชา" (Toggle add course picker panel)
  toggleAddCoursePicker(): void {
    this.showAddCoursePicker.update((v) => !v);
    if (this.showAddCoursePicker()) {
      const letters = this.availableLetters();
      if (letters.length > 0 && !this.selectedLetter()) {
        this.selectLetter(letters[0]);
      }
    }
  }

  // Level 1 Letters
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

  onPickerCodeSearchChange(code: string): void {
    this.pickerCodeQuery.set(code);
    this.triggerPickerServerSearch();
  }

  onPickerNameSearchChange(name: string): void {
    this.pickerNameQuery.set(name);
    this.triggerPickerServerSearch();
  }

  private triggerPickerServerSearch(): void {
    const code = this.pickerCodeQuery().trim();
    const name = this.pickerNameQuery().trim();

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

  isCourseSelectedInModal(courseNo: string): boolean {
    return this.selectedCourses().some((c) => c.COURSE_NO === courseNo);
  }

  toggleCourseInModal(course: UgbCourseOption): void {
    const current = this.selectedCourses();
    const exists = current.some((c) => c.COURSE_NO === course.COURSE_NO);
    if (exists) {
      this.selectedCourses.set(current.filter((c) => c.COURSE_NO !== course.COURSE_NO));
    } else {
      this.selectedCourses.set([...current, course]);
    }
  }

  removeSelectedCourse(courseNo: string): void {
    this.selectedCourses.set(this.selectedCourses().filter((c) => c.COURSE_NO !== courseNo));
  }

  clearAllSelectedCourses(): void {
    this.selectedCourses.set([]);
  }

  // Save Courses into RG_SCHEDULE_CURRICULUM
  saveCurriculumCourses(): void {
    if (this.isSaving()) return;

    if (!this.modalFacultyNo || !this.modalGroupNo) {
      this.formError = 'กรุณาเลือกคณะ และกลุ่มวิชา';
      return;
    }

    const list = this.selectedCourses();
    if (list.length === 0) {
      this.formError = 'กรุณาเลือกวิชาที่ต้องการเพิ่มอย่างน้อย 1 วิชา';
      return;
    }

    this.formError = '';
    this.isSaving.set(true);

    const payload = {
      facultyNo: this.modalFacultyNo,
      groupNo: this.modalGroupNo,
      subGroupNo: this.modalSubGroupNo || '00',
      yearLevel: this.modalYearLevel,
      semester: this.modalSemester,
      courseNos: list.map((c) => c.COURSE_NO),
    };

    this.http
      .post<{ success: boolean; message: string; addedCount?: number; skippedCount?: number }>(
        `${this.getBaseUrl()}/curriculum/add`,
        payload
      )
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res && res.success) {
            this.toastService.success(res.message);
            this.selectedCourses.set([]);
            this.loadExistingCoursesForModal();
            this.loadCurriculumList();
          } else {
            this.formError = res.message;
            this.toastService.error(res.message);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || 'เกิดข้อผิดพลาดในการบันทึกวิชาในหลักสูตร';
          this.formError = msg;
          this.toastService.error(msg);
        },
      });
  }

  // Delete Individual Course -> Stored in RG_SCHEDULE_CURRICULUM_HIS
  deleteCurriculumCourse(row: CurriculumCourseRow): void {
    if (this.isDeleting()) return;

    if (
      confirm(
        `คุณต้องการลบวิชา "${row.COURSE_NO} (${row.COURSE_NAME_THAI || ''})" ออกจากหลักสูตรใช่หรือไม่?\n(ระบบจะจัดเก็บประวัติการลบไว้ในตาราง HIS)`
      )
    ) {
      this.isDeleting.set(true);
      const payload = {
        facultyNo: row.FACULTY_NO,
        groupNo: row.GROUP_NO,
        subGroupNo: row.SUB_GROUP_NO || '00',
        yearLevel: row.YEAR_LEVEL,
        semester: row.SEMESTER,
        courseNo: row.COURSE_NO,
      };

      this.http.post<{ success: boolean; message: string }>(`${this.getBaseUrl()}/curriculum/delete`, payload).subscribe({
        next: (res) => {
          this.isDeleting.set(false);
          this.toastService.success(res.message || `ลบวิชา ${row.COURSE_NO} ออกจากหลักสูตรสำเร็จ`);
          this.loadCurriculumList();
          if (this.isModalOpen()) {
            this.loadExistingCoursesForModal();
          }
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.toastService.error(err?.error?.message || 'เกิดข้อผิดพลาดในการลบวิชา');
        },
      });
    }
  }

  // Bulk Delete Selected Courses
  deleteSelectedCourses(): void {
    const keys = this.selectedKeys();
    if (keys.length === 0 || this.isDeleting()) return;

    if (
      confirm(
        `คุณต้องการลบวิชาในหลักสูตรที่เลือกทั้งหมด ${keys.length} รายการ ใช่หรือไม่?\n(ระบบจะจัดเก็บประวัติการลบทั้งหมดไว้ในตาราง HIS)`
      )
    ) {
      this.isDeleting.set(true);
      const allRows = this.curriculumCourses();
      const itemsToDelete = allRows
        .filter((r) => keys.includes(this.getRowKey(r)))
        .map((r) => ({
          facultyNo: r.FACULTY_NO,
          groupNo: r.GROUP_NO,
          subGroupNo: r.SUB_GROUP_NO || '00',
          yearLevel: r.YEAR_LEVEL,
          semester: r.SEMESTER,
          courseNo: r.COURSE_NO,
        }));

      this.http
        .post<{ success: boolean; message: string; deletedCount?: number }>(
          `${this.getBaseUrl()}/curriculum/delete-bulk`,
          { items: itemsToDelete }
        )
        .subscribe({
          next: (res) => {
            this.isDeleting.set(false);
            this.toastService.success(res.message || `ลบวิชาในหลักสูตรสำเร็จ ${itemsToDelete.length} วิชา`);
            this.selectedKeys.set([]);
            this.loadCurriculumList();
          },
          error: (err) => {
            this.isDeleting.set(false);
            this.toastService.error(err?.error?.message || 'เกิดข้อผิดพลาดในการลบรายการ');
          },
        });
    }
  }
}
