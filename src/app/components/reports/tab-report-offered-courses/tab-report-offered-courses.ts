import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { ToastService } from '../../../services/toast.service';

export interface ScheduleCourseItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  COURSE_REMARK?: string | null;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
}

export interface YearSemOption {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  STUDY_ACTIVE: string;
}

@Component({
  selector: 'app-tab-report-offered-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-report-offered-courses.html',
  styleUrl: './tab-report-offered-courses.css',
})
export class TabReportOfferedCoursesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Selected Year & Semester
  readonly yearSemList = signal<YearSemOption[]>([]);
  readonly selectedYear = signal<string>('2569');
  readonly selectedSemester = signal<string>('1');

  // Offered Courses Data from DB
  readonly courses = signal<ScheduleCourseItem[]>([]);

  // YearSem Dropdown Options
  readonly yearSemSelectOptions = computed<SelectOption[]>(() => {
    return this.yearSemList().map((y) => ({
      value: `${y.STUDY_YEAR}_${y.STUDY_SEMESTER}`,
      label: `ปีการศึกษา ${y.STUDY_YEAR} ภาค ${y.STUDY_SEMESTER}`,
      badge: y.STUDY_ACTIVE === '1' ? 'ปีภาคปัจจุบัน' : undefined,
      icon: 'event_available',
    }));
  });

  readonly selectedYearSemKey = computed(() => {
    return `${this.selectedYear()}_${this.selectedSemester()}`;
  });

  // Filtered Courses based on search
  readonly filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.courses();
    if (!q) return list;

    return list.filter((c) => {
      const code = (c.COURSE_NO || '').toLowerCase();
      const thai = (c.COURSE_NAME_THAI || '').toLowerCase();
      const eng = (c.COURSE_NAME_ENG_L || '').toLowerCase();
      return code.includes(q) || thai.includes(q) || eng.includes(q);
    });
  });

  // Total Summary Stats
  readonly totalCredits = computed(() => {
    return this.filteredCourses().reduce((sum, c) => sum + (Number(c.CREDIT) || 0), 0);
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

  ngOnInit(): void {
    this.loadYearSemOptions();
  }

  private getBaseUrl(): string {
    return window.location.port === '4200' ? 'http://localhost:4000/api/service' : '/api/service';
  }

  // Load YearSem list
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
          this.loadOfferedCourses();
        }
      },
      error: () => {
        this.loadOfferedCourses();
      },
    });
  }

  onYearSemChange(key: string): void {
    if (!key) return;
    const parts = key.split('_');
    if (parts.length === 2) {
      this.selectedYear.set(parts[0]);
      this.selectedSemester.set(parts[1]);
      this.currentPage.set(1);
      this.loadOfferedCourses();
    }
  }

  // Load Offered Courses from RG_SCHEDULE_COURSE
  loadOfferedCourses(): void {
    const yr = this.selectedYear();
    const sem = this.selectedSemester();
    if (!yr || !sem) return;

    this.isLoading.set(true);
    this.http
      .get<{ success: boolean; results: ScheduleCourseItem[] }>(
        `${this.getBaseUrl()}/course/list?year=${yr}&semester=${sem}`
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
        error: (err) => {
          this.isLoading.set(false);
          this.courses.set([]);
          this.toastService.error(err?.error?.message || 'ไม่สามารถโหลดข้อมูลวิชาที่เปิดสอนได้');
        },
      });
  }

  printReport(): void {
    window.print();
  }
}
