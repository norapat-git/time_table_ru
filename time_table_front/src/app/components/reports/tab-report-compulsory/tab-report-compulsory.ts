import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { ToastService } from '../../../services/toast.service';

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

export interface CurriculumReportRow {
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

export interface GroupedFacultySection {
  facultyNo: string;
  facultyNameThai: string;
  facultyNameShort?: string;
  totalCourses: number;
  totalCredits: number;
  groups: {
    groupNo: string;
    groupName: string;
    courses: CurriculumReportRow[];
  }[];
}

@Component({
  selector: 'app-tab-report-compulsory',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-report-compulsory.html',
  styleUrl: './tab-report-compulsory.css',
})
export class TabReportCompulsoryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Master Filter Signals
  readonly selectedFaculty = signal<string>('ALL');
  readonly selectedGroup = signal<string>('ALL');
  readonly selectedSubGroup = signal<string>('ALL');
  readonly selectedYearLevel = signal<string>('ALL');
  readonly selectedSemester = signal<string>('ALL');

  // View Mode: 'table' vs 'grouped'
  readonly viewMode = signal<'table' | 'grouped'>('table');

  // Master Data Lists
  readonly facultiesList = signal<FacultyItem[]>([]);
  readonly groupsList = signal<ProgramGroupItem[]>([]);
  readonly subGroupsList = signal<ProgramSubGroupItem[]>([]);
  readonly coursesList = signal<CurriculumReportRow[]>([]);

  // Detail Modal State
  readonly selectedCourseDetail = signal<CurriculumReportRow | null>(null);
  readonly isDetailModalOpen = signal<boolean>(false);

  // ============================================================
  // Select Options (Computed)
  // ============================================================

  readonly facultySelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [
      { value: 'ALL', label: 'ทุกคณะ (All Faculties)', badge: 'ทั้งหมด', icon: 'account_balance' },
    ];
    this.facultiesList().forEach((f) => {
      list.push({
        value: f.FACULTY_NO,
        label: f.FACULTY_NAME_THAI || f.FACULTY_NO,
        badge: f.FACULTY_NAME_SHORT || undefined,
        icon: 'domain',
      });
    });
    return list;
  });

  readonly groupSelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [
      { value: 'ALL', label: 'ทุกกลุ่มวิชา/สาขา (All Groups)', badge: 'ทั้งหมด', icon: 'folder_open' },
    ];
    this.groupsList().forEach((g) => {
      list.push({
        value: g.GROUP_NO,
        label: g.GROUP_NAME || g.GROUP_NO,
        icon: 'folder',
      });
    });
    return list;
  });

  readonly subGroupSelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [
      { value: 'ALL', label: 'ทุกกลุ่มย่อย (All Sub-groups)', badge: 'ทั้งหมด' },
    ];
    this.subGroupsList().forEach((sg) => {
      list.push({
        value: sg.SUB_GROUP_NO,
        label: sg.SUB_GROUP_NAME || sg.SUB_GROUP_NO,
      });
    });
    return list;
  });

  readonly yearLevelSelectOptions = computed<SelectOption[]>(() => [
    { value: 'ALL', label: 'ทุกชั้นปี (All Years)', badge: 'ทั้งหมด' },
    { value: '1', label: 'ชั้นปีที่ 1', badge: 'ปี 1' },
    { value: '2', label: 'ชั้นปีที่ 2', badge: 'ปี 2' },
    { value: '3', label: 'ชั้นปีที่ 3', badge: 'ปี 3' },
    { value: '4', label: 'ชั้นปีที่ 4', badge: 'ปี 4' },
  ]);

  readonly semesterSelectOptions = computed<SelectOption[]>(() => [
    { value: 'ALL', label: 'ทุกภาคการศึกษา (All Semesters)', badge: 'ทั้งหมด' },
    { value: '1', label: 'ภาคการศึกษาที่ 1', badge: 'ภาค 1' },
    { value: '2', label: 'ภาคการศึกษาที่ 2', badge: 'ภาค 2' },
    { value: '3', label: 'ภาคฤดูร้อน (Summer)', badge: 'ฤดูร้อน' },
  ]);

  // ============================================================
  // Filtered Results & KPI Stats
  // ============================================================

  readonly filteredCourses = computed<CurriculumReportRow[]>(() => {
    const fac = this.selectedFaculty();
    const grp = this.selectedGroup();
    const sub = this.selectedSubGroup();
    const yr = this.selectedYearLevel();
    const sem = this.selectedSemester();
    const q = this.searchQuery().trim().toLowerCase();

    return this.coursesList().filter((item) => {
      if (fac !== 'ALL' && item.FACULTY_NO !== fac) return false;
      if (grp !== 'ALL' && item.GROUP_NO !== grp) return false;
      if (sub !== 'ALL' && item.SUB_GROUP_NO !== sub) return false;
      if (yr !== 'ALL' && item.YEAR_LEVEL !== yr) return false;
      if (sem !== 'ALL' && item.SEMESTER !== sem) return false;

      if (!q) return true;

      const codeMatch = (item.COURSE_NO || '').toLowerCase().includes(q);
      const thMatch = (item.COURSE_NAME_THAI || '').toLowerCase().includes(q);
      const engMatch = (item.COURSE_NAME_ENG_L || '').toLowerCase().includes(q);
      const facMatch = (item.FACULTY_NAME_THAI || '').toLowerCase().includes(q);
      const grpMatch = (item.GROUP_NAME || '').toLowerCase().includes(q);
      const subMatch = (item.SUB_GROUP_NAME || '').toLowerCase().includes(q);

      return codeMatch || thMatch || engMatch || facMatch || grpMatch || subMatch;
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

  readonly totalCoursesCount = computed(() => this.filteredCourses().length);

  readonly totalCreditsCount = computed(() => {
    return this.filteredCourses().reduce((sum, c) => sum + (Number(c.CREDIT) || 0), 0);
  });

  readonly uniqueFacultiesCount = computed(() => {
    const set = new Set(this.filteredCourses().map((c) => c.FACULTY_NO));
    return set.size;
  });

  readonly uniqueGroupsCount = computed(() => {
    const set = new Set(this.filteredCourses().map((c) => `${c.FACULTY_NO}_${c.GROUP_NO}`));
    return set.size;
  });

  // Grouped Hierarchical View (Faculty -> Group -> Courses)
  readonly groupedByFaculty = computed<GroupedFacultySection[]>(() => {
    const courses = this.filteredCourses();
    const facultyMap = new Map<string, GroupedFacultySection>();

    courses.forEach((c) => {
      const fNo = c.FACULTY_NO || 'OTHER';
      if (!facultyMap.has(fNo)) {
        facultyMap.set(fNo, {
          facultyNo: fNo,
          facultyNameThai: c.FACULTY_NAME_THAI || `คณะรหัส ${fNo}`,
          facultyNameShort: c.FACULTY_NAME_SHORT,
          totalCourses: 0,
          totalCredits: 0,
          groups: [],
        });
      }

      const facSection = facultyMap.get(fNo)!;
      facSection.totalCourses++;
      facSection.totalCredits += Number(c.CREDIT) || 0;

      const gNo = c.GROUP_NO || 'OTHER';
      let grpSection = facSection.groups.find((g) => g.groupNo === gNo);
      if (!grpSection) {
        grpSection = {
          groupNo: gNo,
          groupName: c.GROUP_NAME || `กลุ่มรหัส ${gNo}`,
          courses: [],
        };
        facSection.groups.push(grpSection);
      }

      grpSection.courses.push(c);
    });

    return Array.from(facultyMap.values());
  });

  // ============================================================
  // Lifecycle & API Calls
  // ============================================================

  ngOnInit(): void {
    this.loadFaculties();
    this.loadCurriculumReport();
  }

  private getBaseUrl(): string {
    return window.location.port === '4200' ? 'http://localhost:4000/api/service/curriculum' : '/api/service/curriculum';
  }

  loadFaculties(): void {
    this.http.get<{ success: boolean; results: FacultyItem[] }>(`${this.getBaseUrl()}/faculties`).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.results)) {
          this.facultiesList.set(res.results);
        }
      },
      error: (err) => console.error('Error loading faculties', err),
    });
  }

  loadCurriculumReport(): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; results: CurriculumReportRow[] }>(`${this.getBaseUrl()}/list`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success && Array.isArray(res.results)) {
          this.coursesList.set(res.results);
        } else {
          this.coursesList.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.coursesList.set([]);
        this.toastService.error(err?.error?.message || 'ไม่สามารถโหลดข้อมูลรายงานวิชาบังคับได้');
      },
    });
  }

  onFacultyChange(facultyNo: string): void {
    this.selectedFaculty.set(facultyNo);
    this.selectedGroup.set('ALL');
    this.selectedSubGroup.set('ALL');
    this.groupsList.set([]);
    this.subGroupsList.set([]);
    this.currentPage.set(1);

    if (facultyNo && facultyNo !== 'ALL') {
      this.http.get<{ success: boolean; results: ProgramGroupItem[] }>(`${this.getBaseUrl()}/groups/${facultyNo}`).subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.results)) {
            this.groupsList.set(res.results);
          }
        },
      });
    }
  }

  onGroupChange(groupNo: string): void {
    this.selectedGroup.set(groupNo);
    this.selectedSubGroup.set('ALL');
    this.subGroupsList.set([]);
    this.currentPage.set(1);

    const fac = this.selectedFaculty();
    if (fac && fac !== 'ALL' && groupNo && groupNo !== 'ALL') {
      this.http.get<{ success: boolean; results: ProgramSubGroupItem[] }>(`${this.getBaseUrl()}/sub-groups/${fac}/${groupNo}`).subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.results)) {
            this.subGroupsList.set(res.results);
          }
        },
      });
    }
  }

  resetFilters(): void {
    this.selectedFaculty.set('ALL');
    this.selectedGroup.set('ALL');
    this.selectedSubGroup.set('ALL');
    this.selectedYearLevel.set('ALL');
    this.selectedSemester.set('ALL');
    this.searchQuery.set('');
    this.groupsList.set([]);
    this.subGroupsList.set([]);
    this.currentPage.set(1);
  }

  // ============================================================
  // Formatting Helpers
  // ============================================================

  getYearLevelBadgeClass(year: string): string {
    switch (year) {
      case '1': return 'badge-year-1';
      case '2': return 'badge-year-2';
      case '3': return 'badge-year-3';
      case '4': return 'badge-year-4';
      default: return 'badge-year-default';
    }
  }

  getSemesterLabel(sem: string): string {
    switch (sem) {
      case '1': return 'ภาค 1';
      case '2': return 'ภาค 2';
      case '3': return 'ฤดูร้อน';
      default: return `ภาค ${sem}`;
    }
  }

  // ============================================================
  // Modal & Export Actions
  // ============================================================

  openDetailModal(item: CurriculumReportRow): void {
    this.selectedCourseDetail.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedCourseDetail.set(null);
  }

  printReport(): void {
    window.print();
  }

  exportToCsv(): void {
    const list = this.filteredCourses();
    if (list.length === 0) {
      this.toastService.warning('ไม่มีข้อมูลสำหรับส่งออก CSV');
      return;
    }

    const headers = [
      'ลำดับ',
      'รหัสคณะ',
      'คณะ',
      'รหัสกลุ่มวิชา',
      'กลุ่มวิชา/สาขา',
      'รหัสกลุ่มย่อย',
      'กลุ่มวิชาย่อย',
      'ชั้นปีที่',
      'ภาคการศึกษา',
      'รหัสวิชา',
      'ชื่อวิชา (ภาษาไทย)',
      'ชื่อวิชา (ภาษาอังกฤษ)',
      'หน่วยกิต',
      'ปีหลักสูตร',
    ];

    const rows = list.map((item, idx) => [
      idx + 1,
      `"${item.FACULTY_NO || ''}"`,
      `"${(item.FACULTY_NAME_THAI || '').replace(/"/g, '""')}"`,
      `"${item.GROUP_NO || ''}"`,
      `"${(item.GROUP_NAME || '').replace(/"/g, '""')}"`,
      `"${item.SUB_GROUP_NO || ''}"`,
      `"${(item.SUB_GROUP_NAME || '').replace(/"/g, '""')}"`,
      `"${item.YEAR_LEVEL || ''}"`,
      `"${item.SEMESTER || ''}"`,
      `"${item.COURSE_NO || ''}"`,
      `"${(item.COURSE_NAME_THAI || '').replace(/"/g, '""')}"`,
      `"${(item.COURSE_NAME_ENG_L || '').replace(/"/g, '""')}"`,
      item.CREDIT != null ? item.CREDIT : '',
      `"${item.YEAR_ENROLL || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานวิชาบังคับตามแผน_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toastService.success(`ส่งออกข้อมูล ${list.length} รายการเป็นไฟล์ CSV เรียบร้อยแล้ว`);
  }
}
