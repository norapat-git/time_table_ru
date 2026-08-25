import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface YearSemItem {
  STUDY_YEAR: string;     // ปีการศึกษา เช่น '2569'
  STUDY_SEMESTER: string; // ภาคการศึกษา เช่น '1', '2', 'S'
  STUDY_ACTIVE: string;   // '1' = ปีภาคที่ใช้งาน, '0' = ไม่ได้ใช้งาน
}

@Component({
  selector: 'app-tab-academic-year',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-academic-year.html',
  styleUrl: './tab-academic-year.css',
})
export class TabAcademicYearComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Main YearSem Records
  readonly records = signal<YearSemItem[]>([
    { STUDY_YEAR: '2569', STUDY_SEMESTER: '1', STUDY_ACTIVE: '1' },
    { STUDY_YEAR: '2568', STUDY_SEMESTER: '2', STUDY_ACTIVE: '0' },
    { STUDY_YEAR: '2568', STUDY_SEMESTER: '1', STUDY_ACTIVE: '0' },
    { STUDY_YEAR: '2567', STUDY_SEMESTER: '2', STUDY_ACTIVE: '0' },
    { STUDY_YEAR: '2567', STUDY_SEMESTER: '1', STUDY_ACTIVE: '0' },
  ]);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingOldYear = signal<string | null>(null);
  readonly editingOldSem = signal<string | null>(null);

  // Form Fields
  modalYear: string = '2569';
  modalSemester: string = '1';
  modalIsActive: boolean = false;
  formError: string = '';

  // Filtered Records
  readonly filteredRecords = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.records();
    if (!q) return list;

    return list.filter((r) => {
      const term = `ภาค ${r.STUDY_SEMESTER} / ${r.STUDY_YEAR}`.toLowerCase();
      const simple = `${r.STUDY_SEMESTER}/${r.STUDY_YEAR}`;
      const yearStr = `${r.STUDY_YEAR}`;
      return term.includes(q) || simple.includes(q) || yearStr.includes(q);
    });
  });

  ngOnInit(): void {
    this.loadYearSemList();
  }

  private getBaseUrl(): string {
    return window.location.port === '4200' ? 'http://localhost:4000/api/service/yearsem' : '/api/service/yearsem';
  }

  loadYearSemList(): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; results: YearSemItem[] }>(`${this.getBaseUrl()}/list`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success && Array.isArray(res.results) && res.results.length > 0) {
          this.records.set(res.results);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  // Open Modal for Add
  openAddModal(): void {
    this.isEditing.set(false);
    this.editingOldYear.set(null);
    this.editingOldSem.set(null);
    this.modalYear = '2570';
    this.modalSemester = '1';
    this.modalIsActive = false;
    this.formError = '';
    this.isModalOpen.set(true);
  }

  // Open Modal for Edit
  openEditModal(item: YearSemItem): void {
    this.isEditing.set(true);
    this.editingOldYear.set(item.STUDY_YEAR);
    this.editingOldSem.set(item.STUDY_SEMESTER);
    this.modalYear = item.STUDY_YEAR;
    this.modalSemester = item.STUDY_SEMESTER;
    this.modalIsActive = item.STUDY_ACTIVE === '1';
    this.formError = '';
    this.isModalOpen.set(true);
  }

  // Save (Add or Update) + Check duplicate
  saveRecord(): void {
    const year = this.modalYear.trim();
    const sem = this.modalSemester.trim();
    const active = this.modalIsActive ? '1' : '0';

    if (!year || !sem) {
      this.formError = 'กรุณาระบุปีการศึกษาและภาคการศึกษา';
      return;
    }

    // Check duplicate locally first
    const isEdit = this.isEditing();
    const oldYear = this.editingOldYear();
    const oldSem = this.editingOldSem();

    const isDuplicate = this.records().some((r) => {
      if (isEdit && r.STUDY_YEAR === oldYear && r.STUDY_SEMESTER === oldSem) {
        return false;
      }
      return r.STUDY_YEAR === year && r.STUDY_SEMESTER === sem;
    });

    if (isDuplicate) {
      this.formError = `ปีการศึกษา ${year} ภาคการศึกษาที่ ${sem} มีอยู่ในระบบแล้ว`;
      return;
    }

    this.formError = '';

    if (isEdit && oldYear && oldSem) {
      // Update
      const payload = {
        oldYear,
        oldSemester: oldSem,
        newYear: year,
        newSemester: sem,
        studyActive: active,
      };

      this.http.put<{ success: boolean; message: string }>(`${this.getBaseUrl()}/update`, payload).subscribe({
        next: (res) => {
          if (res && res.success === false) {
            this.formError = res.message;
            return;
          }
          this.updateLocalState(payload);
          this.closeModal();
        },
        error: (err) => {
          this.updateLocalState(payload);
          this.closeModal();
        },
      });
    } else {
      // Add
      const payload = {
        studyYear: year,
        studySemester: sem,
        studyActive: active,
      };

      this.http.post<{ success: boolean; message: string }>(`${this.getBaseUrl()}/add`, payload).subscribe({
        next: (res) => {
          if (res && res.success === false) {
            this.formError = res.message;
            return;
          }
          this.insertLocalState(payload);
          this.closeModal();
        },
        error: (err) => {
          this.insertLocalState(payload);
          this.closeModal();
        },
      });
    }
  }

  private updateLocalState(payload: { oldYear: string; oldSemester: string; newYear: string; newSemester: string; studyActive: string }): void {
    this.records.update((items) =>
      items.map((item) => {
        if (item.STUDY_YEAR === payload.oldYear && item.STUDY_SEMESTER === payload.oldSemester) {
          return {
            STUDY_YEAR: payload.newYear,
            STUDY_SEMESTER: payload.newSemester,
            STUDY_ACTIVE: payload.studyActive,
          };
        }
        if (payload.studyActive === '1') {
          return { ...item, STUDY_ACTIVE: '0' };
        }
        return item;
      })
    );
  }

  private insertLocalState(payload: { studyYear: string; studySemester: string; studyActive: string }): void {
    const newItem: YearSemItem = {
      STUDY_YEAR: payload.studyYear,
      STUDY_SEMESTER: payload.studySemester,
      STUDY_ACTIVE: payload.studyActive,
    };

    if (payload.studyActive === '1') {
      this.records.update((items) => [
        newItem,
        ...items.map((it) => ({ ...it, STUDY_ACTIVE: '0' })),
      ]);
    } else {
      this.records.update((items) => [newItem, ...items]);
    }
  }

  // Set as Active Semester directly
  setActive(item: YearSemItem): void {
    const payload = { studyYear: item.STUDY_YEAR, studySemester: item.STUDY_SEMESTER };
    this.http.put<{ success: boolean }>(`${this.getBaseUrl()}/set-active`, payload).subscribe({
      next: () => {
        this.records.update((items) =>
          items.map((r) => ({
            ...r,
            STUDY_ACTIVE: r.STUDY_YEAR === item.STUDY_YEAR && r.STUDY_SEMESTER === item.STUDY_SEMESTER ? '1' : '0',
          }))
        );
      },
      error: () => {
        this.records.update((items) =>
          items.map((r) => ({
            ...r,
            STUDY_ACTIVE: r.STUDY_YEAR === item.STUDY_YEAR && r.STUDY_SEMESTER === item.STUDY_SEMESTER ? '1' : '0',
          }))
        );
      },
    });
  }

  // Delete
  deleteRecord(item: YearSemItem): void {
    const confirmMsg = `คุณต้องการลบ "ปีการศึกษา ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER}" ใช่หรือไม่?`;
    if (confirm(confirmMsg)) {
      this.http.delete(`${this.getBaseUrl()}/delete/${item.STUDY_YEAR}/${item.STUDY_SEMESTER}`).subscribe({
        next: () => {
          this.records.update((items) =>
            items.filter((r) => !(r.STUDY_YEAR === item.STUDY_YEAR && r.STUDY_SEMESTER === item.STUDY_SEMESTER))
          );
        },
        error: () => {
          this.records.update((items) =>
            items.filter((r) => !(r.STUDY_YEAR === item.STUDY_YEAR && r.STUDY_SEMESTER === item.STUDY_SEMESTER))
          );
        },
      });
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }
}
