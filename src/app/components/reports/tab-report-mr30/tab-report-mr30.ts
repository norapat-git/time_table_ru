import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { ToastService } from '../../../services/toast.service';

export interface Mr30Instructor {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  SEQUENCE_INSTRUCTOR?: number;
}

export interface Mr30ReportItem {
  key: string;
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
  SECTION_NO: number;
  COURSE_METHOD?: number;
  COURSE_METHOD_NUMBER?: number;
  DAY_CODE: number;
  TIME_CODE: number;
  TIME_START?: string;
  TIME_END?: string;
  PERIOD: string;
  BUILDING_CODE?: string;
  ROOM_CODE?: string;
  FACULTY_NO?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  INSTRUCTORS: Mr30Instructor[];
}

export interface FacultyOption {
  FACULTY_NO: string;
  FACULTY_NAME_THAI: string;
  FACULTY_NAME_SHORT?: string;
}

export interface YearSemItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  STUDY_ACTIVE: string;
}

@Component({
  selector: 'app-tab-report-mr30',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-report-mr30.html',
  styleUrl: './tab-report-mr30.css',
})
export class TabReportMr30Component implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  // Year & Semester State
  readonly activeYear = signal<string>('');
  readonly activeSemester = signal<string>('');
  readonly yearSemList = signal<YearSemItem[]>([]);

  // Filter States
  readonly facultiesList = signal<FacultyOption[]>([]);
  readonly selectedFaculty = signal<string>('ALL');
  readonly selectedDay = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  // Report Data & Summary
  readonly reportItems = signal<Mr30ReportItem[]>([]);
  readonly summaryStats = signal({
    totalCourses: 0,
    totalSlots: 0,
    totalInstructors: 0,
    totalFaculties: 0,
  });

  // Pagination State
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Detail Modal State
  readonly selectedItemDetail = signal<Mr30ReportItem | null>(null);
  readonly isDetailModalOpen = signal<boolean>(false);

  // Day Options Constant
  readonly dayOptions: { code: number; label: string; shortLabel: string; colorClass: string }[] = [
    { code: 1, label: 'วันจันทร์ (Monday)', shortLabel: 'จันทร์', colorClass: 'day-mon' },
    { code: 2, label: 'วันอังคาร (Tuesday)', shortLabel: 'อังคาร', colorClass: 'day-tue' },
    { code: 3, label: 'วันพุธ (Wednesday)', shortLabel: 'พุธ', colorClass: 'day-wed' },
    { code: 4, label: 'วันพฤหัสบดี (Thursday)', shortLabel: 'พฤหัสบดี', colorClass: 'day-thu' },
    { code: 5, label: 'วันศุกร์ (Friday)', shortLabel: 'ศุกร์', colorClass: 'day-fri' },
    { code: 6, label: 'วันเสาร์ (Saturday)', shortLabel: 'เสาร์', colorClass: 'day-sat' },
    { code: 7, label: 'วันอาทิตย์ (Sunday)', shortLabel: 'อาทิตย์', colorClass: 'day-sun' },
    { code: 0, label: 'ไม่ระบุวัน (Unspecified)', shortLabel: 'ไม่ระบุวัน', colorClass: 'day-default' },
  ];

  // Faculty Select Options
  readonly facultySelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ value: 'ALL', label: 'คณะทั้งหมด (All Faculties)', badge: 'ทั้งหมด' }];
    for (const f of this.facultiesList()) {
      list.push({
        value: f.FACULTY_NO,
        label: f.FACULTY_NAME_THAI || f.FACULTY_NO,
        badge: f.FACULTY_NAME_SHORT || f.FACULTY_NO,
      });
    }
    return list;
  });

  // Day Filter Select Options
  readonly daySelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ value: 'ALL', label: 'ทุกวัน (All Days)', badge: 'ทั้งหมด' }];
    for (const d of this.dayOptions) {
      list.push({
        value: d.code,
        label: d.label,
        badge: d.shortLabel,
      });
    }
    return list;
  });

  // Page Size Select Options
  readonly pageSizeOptions: SelectOption[] = [
    { value: 10, label: '10 รายการ' },
    { value: 25, label: '25 รายการ' },
    { value: 50, label: '50 รายการ' },
    { value: 100, label: '100 รายการ' },
    { value: 99999, label: 'ทั้งหมด' },
  ];

  // Year/Semester Select Options
  readonly yearSemSelectOptions = computed<SelectOption[]>(() => {
    return this.yearSemList().map((ys) => {
      const isAct = ys.STUDY_ACTIVE === '1';
      return {
        value: `${ys.STUDY_YEAR}_${ys.STUDY_SEMESTER}`,
        label: `ปีการศึกษา ${ys.STUDY_YEAR} ภาค ${ys.STUDY_SEMESTER}${isAct ? ' (ปัจจุบัน)' : ''}`,
        badge: isAct ? 'ปัจจุบัน' : undefined,
      };
    });
  });

  // Selected Year/Sem Combined Key
  readonly currentYearSemKey = computed(() => {
    if (!this.activeYear() || !this.activeSemester()) return '';
    return `${this.activeYear()}_${this.activeSemester()}`;
  });

  // Filtered Items (Client-side Search & Instant Filter)
  readonly filteredItems = computed(() => {
    let list = this.reportItems();
    const q = this.searchQuery().trim().toLowerCase();
    const fac = this.selectedFaculty();
    const day = this.selectedDay();

    if (fac && fac !== 'ALL') {
      list = list.filter((item) => (item.FACULTY_NO || '').trim() === fac);
    }

    if (day && day !== 'ALL') {
      const dNum = Number(day);
      list = list.filter((item) => Number(item.DAY_CODE) === dNum);
    }

    if (q) {
      list = list.filter(
        (item) =>
          item.COURSE_NO.toLowerCase().includes(q) ||
          (item.COURSE_NAME_THAI || '').toLowerCase().includes(q) ||
          (item.COURSE_NAME_ENG || '').toLowerCase().includes(q) ||
          (item.ROOM_CODE || '').toLowerCase().includes(q) ||
          (item.BUILDING_CODE || '').toLowerCase().includes(q) ||
          (item.FACULTY_NAME_THAI || '').toLowerCase().includes(q) ||
          (item.INSTRUCTORS || []).some(
            (i) =>
              (i.INSTRUCTOR_CODE || '').toLowerCase().includes(q) ||
              (i.INSTRUCTOR_NAME_THAI || '').toLowerCase().includes(q)
          )
      );
    }

    return list;
  });

  // Pagination Calculations
  readonly totalItems = computed(() => this.filteredItems().length);
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

  readonly paginatedItems = computed(() => {
    const list = this.filteredItems();
    const page = this.currentPage();
    const size = this.pageSize();
    if (size >= 9999) return list;
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadFaculties();
    this.loadYearSemesters();
  }

  loadFaculties(): void {
    this.http.get<{ success: boolean; results: FacultyOption[] }>('/api/service/report/mr30/faculties').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.facultiesList.set(res.results || []);
        }
      },
      error: (err) => console.error('[loadFaculties error]', err),
    });
  }

  loadYearSemesters(): void {
    this.http.get<{ success: boolean; results: YearSemItem[] }>('/api/service/yearsem/list').subscribe({
      next: (res) => {
        if (res && res.success && res.results) {
          this.yearSemList.set(res.results);
          const active = res.results.find((y) => y.STUDY_ACTIVE === '1') || res.results[0];
          if (active) {
            this.activeYear.set(active.STUDY_YEAR);
            this.activeSemester.set(active.STUDY_SEMESTER);
          }
        }
        this.loadReportData();
      },
      error: () => this.loadReportData(),
    });
  }

  onYearSemChange(key: any): void {
    if (!key) return;
    const parts = key.toString().split('_');
    if (parts.length === 2) {
      this.activeYear.set(parts[0]);
      this.activeSemester.set(parts[1]);
      this.currentPage.set(1);
      this.loadReportData();
    }
  }

  loadReportData(): void {
    this.isLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();

    let url = `/api/service/report/mr30?year=${year}&semester=${sem}`;

    this.http
      .get<{
        success: boolean;
        results: Mr30ReportItem[];
        summary: { totalCourses: number; totalSlots: number; totalInstructors: number; totalFaculties: number };
      }>(url)
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.success) {
            this.reportItems.set(res.results || []);
            this.summaryStats.set(
              res.summary || { totalCourses: 0, totalSlots: 0, totalInstructors: 0, totalFaculties: 0 }
            );
          } else {
            this.reportItems.set([]);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.error(err?.message || 'ไม่สามารถโหลดข้อมูลรายงาน มร.30 ได้');
        },
      });
  }

  getDayLabel(dayCode: number): string {
    const code = Number(dayCode);
    const day = this.dayOptions.find((d) => d.code === code);
    if (day) return day.shortLabel;
    if (code === 0 || isNaN(code)) return 'ไม่ระบุวัน';
    return `วัน ${code}`;
  }

  getDayColorClass(dayCode: number): string {
    const code = Number(dayCode);
    const day = this.dayOptions.find((d) => d.code === code);
    return day ? day.colorClass : 'day-default';
  }

  // Pagination Handlers
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: any): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  openDetailModal(item: Mr30ReportItem): void {
    this.selectedItemDetail.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedItemDetail.set(null);
  }

  printReport(): void {
    window.print();
  }

  exportToCsv(): void {
    const items = this.filteredItems();
    if (items.length === 0) {
      this.toastService.warning('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    this.isExporting.set(true);
    try {
      const headers = [
        'ลำดับ',
        'ปีการศึกษา',
        'ภาคการศึกษา',
        'รหัสวิชา',
        'ชื่อวิชา (ภาษาไทย)',
        'ชื่อวิชา (ภาษาอังกฤษ)',
        'หน่วยกิต',
        'กลุ่มเรียน',
        'วันเรียน',
        'รหัสเวลา',
        'ช่วงเวลาเรียน',
        'อาคาร',
        'ห้องเรียน',
        'คณะ',
        'อาจารย์ผู้สอน',
      ];

      const csvRows = [headers.join(',')];

      items.forEach((item, index) => {
        const instructorsStr = (item.INSTRUCTORS || [])
          .map((i) => `${i.RANK_NAME_THAI_S || ''} ${i.INSTRUCTOR_NAME_THAI || i.INSTRUCTOR_CODE}`.trim())
          .join('; ');

        const row = [
          index + 1,
          `"${item.STUDY_YEAR}"`,
          `"${item.STUDY_SEMESTER}"`,
          `"${item.COURSE_NO}"`,
          `"${(item.COURSE_NAME_THAI || '').replace(/"/g, '""')}"`,
          `"${(item.COURSE_NAME_ENG || '').replace(/"/g, '""')}"`,
          item.CREDIT || '',
          item.SECTION_NO || 1,
          `"${this.getDayLabel(item.DAY_CODE)}"`,
          item.TIME_CODE,
          `"${item.PERIOD}"`,
          `"${item.BUILDING_CODE || ''}"`,
          `"${item.ROOM_CODE || ''}"`,
          `"${(item.FACULTY_NAME_THAI || '').replace(/"/g, '""')}"`,
          `"${instructorsStr.replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `รายงาน_มร30_ปี${this.activeYear()}_ภาค${this.activeSemester()}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.toastService.success(`ส่งออกข้อมูล มร.30 สำเร็จ (${items.length} รายการ)`);
    } catch (e: any) {
      this.toastService.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล: ' + e.message);
    } finally {
      this.isExporting.set(false);
    }
  }
}
