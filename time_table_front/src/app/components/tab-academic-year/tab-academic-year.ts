import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../common/custom-select/custom-select';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

export interface YearSemItem {
  STUDY_YEAR: string;     // ปีการศึกษา เช่น '2569'
  STUDY_SEMESTER: string; // ภาคการศึกษา เช่น '1', '2', 'S'
  STUDY_ACTIVE: string;   // '1' = ปีภาคที่ใช้งาน, '0' = ไม่ได้ใช้งาน
  INSERT_DATE?: string;   // วันที่และเวลาที่บันทึก
  USER_INSERT?: string;   // ผู้บันทึกข้อมูล
}

@Component({
  selector: 'app-tab-academic-year',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent],
  templateUrl: './tab-academic-year.html',
  styleUrl: './tab-academic-year.css',
})
export class TabAcademicYearComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isSettingActive = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Main YearSem Records (Empty default, populated from DB)
  readonly records = signal<YearSemItem[]>([]);

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

  // Semester Options for CustomSelectComponent (Only Semester 1 and 2)
  readonly semesterOptions: SelectOption[] = [
    { value: '1', label: 'ภาค 1', icon: 'looks_one' },
    { value: '2', label: 'ภาค 2', icon: 'looks_two' },
  ];

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
        if (res && res.success && Array.isArray(res.results)) {
          this.records.set(res.results);
        } else {
          this.records.set([]);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.records.set([]);
      },
    });
  }

  // Open Modal for Add
  openAddModal(): void {
    this.isEditing.set(false);
    this.editingOldYear.set(null);
    this.editingOldSem.set(null);
    this.modalYear = '2569';
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

  // Save (Add or Update) + Check duplicate + Validate year >= 2550
  saveRecord(): void {
    const year = this.modalYear.trim();
    const sem = this.modalSemester.trim();
    const active = this.modalIsActive ? '1' : '0';

    if (!year || !sem) {
      this.formError = 'กรุณาระบุปีการศึกษาและภาคการศึกษา';
      return;
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2550 || year.length !== 4) {
      this.formError = 'ปีการศึกษาต้องเป็นตัวเลข 4 หลัก และต้องไม่ต่ำกว่าปี 2550 (เช่น 2567, 2568...)';
      return;
    }

    if (!['1', '2'].includes(sem)) {
      this.formError = 'ภาคการศึกษาต้องเป็นภาค 1 หรือภาค 2 เท่านั้น';
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
    this.isSaving.set(true);

    const currentUserEmail = this.authService.currentUser()?.email || 'ADMIN';

    if (isEdit && oldYear && oldSem) {
      // Update
      const payload = {
        oldYear,
        oldSemester: oldSem,
        newYear: year,
        newSemester: sem,
        studyActive: active,
        userInsert: currentUserEmail,
      };

      this.http.put<{ success: boolean; message: string }>(`${this.getBaseUrl()}/update`, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res && res.success === false) {
            this.formError = res.message;
            this.toastService.error(res.message);
            return;
          }
          this.toastService.success(`แก้ไขปีการศึกษา ${year} ภาค ${sem} สำเร็จ`);
          this.closeModal();
          this.loadYearSemList();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error(err?.message || 'เกิดข้อผิดพลาดในการแก้ไข');
          this.closeModal();
          this.loadYearSemList();
        },
      });
    } else {
      // Add
      const payload = {
        studyYear: year,
        studySemester: sem,
        studyActive: active,
        userInsert: currentUserEmail,
      };

      this.http.post<{ success: boolean; message: string }>(`${this.getBaseUrl()}/add`, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res && res.success === false) {
            this.formError = res.message;
            this.toastService.error(res.message);
            return;
          }
          this.toastService.success(`เพิ่มปีการศึกษา ${year} ภาค ${sem} สำเร็จ`);
          this.closeModal();
          this.loadYearSemList();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error(err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
          this.closeModal();
          this.loadYearSemList();
        },
      });
    }
  }

  // Set as Active Semester directly
  setActive(item: YearSemItem): void {
    if (this.isSettingActive()) return;
    this.isSettingActive.set(true);
    const payload = { studyYear: item.STUDY_YEAR, studySemester: item.STUDY_SEMESTER };
    this.http.put<{ success: boolean; message: string }>(`${this.getBaseUrl()}/set-active`, payload).subscribe({
      next: () => {
        this.isSettingActive.set(false);
        this.toastService.success(`กำหนดปี ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER} เป็นปีภาคที่ใช้งานปัจจุบัน`, 'ตั้งค่าสำเร็จ');
        this.loadYearSemList();
      },
      error: () => {
        this.isSettingActive.set(false);
        this.toastService.error('ไม่สามารถกำหนดปีภาคที่ใช้งานได้');
        this.loadYearSemList();
      },
    });
  }

  // Delete
  deleteRecord(item: YearSemItem): void {
    const confirmMsg = `คุณต้องการลบ "ปีการศึกษา ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER}" ใช่หรือไม่?\n(ข้อมูลวิชาที่เปิดสอนทั้งหมดในปีภาคนี้จะถูกลบออกด้วย โดยระบบจะสำรองประวัติไว้ใน HIS)`;
    if (confirm(confirmMsg)) {
      this.http.delete<{ success: boolean; message: string }>(`${this.getBaseUrl()}/delete/${item.STUDY_YEAR}/${item.STUDY_SEMESTER}`).subscribe({
        next: (res) => {
          this.toastService.success(res?.message || `ลบปีการศึกษา ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER} เรียบร้อยแล้ว`);
          this.records.update((items) =>
            items.filter((r) => !(r.STUDY_YEAR === item.STUDY_YEAR && r.STUDY_SEMESTER === item.STUDY_SEMESTER))
          );
        },
        error: (err) => {
          this.toastService.error(err?.error?.message || 'เกิดข้อผิดพลาดในการลบ');
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
