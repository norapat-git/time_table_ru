import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface OfferedCourseItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  department: string;
  selected?: boolean;
}

@Component({
  selector: 'app-tab-course-search',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-course-search.html',
  styleUrl: './tab-course-search.css',
})
export class TabCourseSearchComponent {
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Course Data
  readonly courses = signal<OfferedCourseItem[]>([
    { id: '1', code: 'ACC1101', name: 'หลักการบัญชี', credits: 3, department: 'บริหารธุรกิจ' },
    { id: '2', code: 'ACC1102', name: 'การบัญชีขั้นกลาง', credits: 3, department: 'บริหารธุรกิจ' },
    { id: '3', code: 'STAT2101', name: 'สถิติเบื้องต้น', credits: 3, department: 'วิทยาศาสตร์' },
    { id: '4', code: 'ENG1001', name: 'ประโยคและย่อหน้าภาษาอังกฤษพื้นฐาน', credits: 3, department: 'ภาษาอังกฤษ' },
    { id: '5', code: 'ENG1002', name: 'ความพร้อมในการอ่านภาษาอังกฤษ', credits: 3, department: 'ภาษาอังกฤษ' },
    { id: '6', code: 'JPN1011', name: 'การฟังและการพูดภาษาญี่ปุ่น 1', credits: 3, department: 'ภาษาญี่ปุ่น' },
    { id: '7', code: 'FRE1001', name: 'ภาษาฝรั่งเศสเบื้องต้น 1', credits: 3, department: 'ภาษาฝรั่งเศส' },
  ]);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);

  // Form Fields
  modalCode: string = '';
  modalName: string = '';
  modalCredits: number = 3;
  modalDept: string = 'ภาษาอังกฤษ';

  // Master Checkbox
  readonly isAllSelected = computed(() => {
    const list = this.filteredCourses();
    return list.length > 0 && list.every((c) => c.selected);
  });

  readonly selectedCount = computed(() => {
    return this.courses().filter((c) => c.selected).length;
  });

  // Filtered List
  readonly filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.courses();
    if (!q) return list;

    return list.filter((c) => {
      const code = c.code.toLowerCase();
      const name = c.name.toLowerCase();
      const dept = c.department.toLowerCase();
      return code.includes(q) || name.includes(q) || dept.includes(q);
    });
  });

  // Master Checkbox Toggle
  toggleSelectAll(checked: boolean): void {
    const visibleIds = new Set(this.filteredCourses().map((c) => c.id));
    this.courses.update((list) =>
      list.map((c) => (visibleIds.has(c.id) ? { ...c, selected: checked } : c))
    );
  }

  // Row Checkbox Toggle
  toggleRowSelect(id: string, checked: boolean): void {
    this.courses.update((list) =>
      list.map((c) => (c.id === id ? { ...c, selected: checked } : c))
    );
  }

  // Open Modal for Add
  openAddModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.modalCode = '';
    this.modalName = '';
    this.modalCredits = 3;
    this.modalDept = 'ภาษาอังกฤษ';
    this.isModalOpen.set(true);
  }

  // Open Modal for Edit
  openEditModal(item: OfferedCourseItem): void {
    this.isEditing.set(true);
    this.editingId.set(item.id);
    this.modalCode = item.code;
    this.modalName = item.name;
    this.modalCredits = item.credits;
    this.modalDept = item.department;
    this.isModalOpen.set(true);
  }

  // Save (Create or Update)
  saveCourse(): void {
    if (!this.modalCode.trim() || !this.modalName.trim()) {
      alert('กรุณากรอกรหัสวิชาและชื่อวิชา');
      return;
    }

    if (this.isEditing() && this.editingId()) {
      const id = this.editingId()!;
      this.courses.update((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                code: this.modalCode.trim().toUpperCase(),
                name: this.modalName.trim(),
                credits: Number(this.modalCredits) || 3,
                department: this.modalDept,
              }
            : item
        )
      );
    } else {
      const newId = (Math.max(0, ...this.courses().map((c) => Number(c.id) || 0)) + 1).toString();
      const newCourse: OfferedCourseItem = {
        id: newId,
        code: this.modalCode.trim().toUpperCase(),
        name: this.modalName.trim(),
        credits: Number(this.modalCredits) || 3,
        department: this.modalDept,
      };
      this.courses.update((items) => [newCourse, ...items]);
    }

    this.closeModal();
  }

  // Delete Individual
  deleteCourse(id: string): void {
    const target = this.courses().find((c) => c.id === id);
    if (!target) return;

    if (confirm(`คุณต้องการลบวิชา "${target.code} ${target.name}" ใช่หรือไม่?`)) {
      this.courses.update((list) => list.filter((c) => c.id !== id));
    }
  }

  // Bulk Delete Selected
  deleteSelected(): void {
    const count = this.selectedCount();
    if (count === 0) return;

    if (confirm(`คุณต้องการลบ ${count} รายการที่เลือก ใช่หรือไม่?`)) {
      this.courses.update((list) => list.filter((c) => !c.selected));
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  simulateRefresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 600);
  }
}
