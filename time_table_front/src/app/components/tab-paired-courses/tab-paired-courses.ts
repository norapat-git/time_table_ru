import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface PairedGroupItem {
  id: string;
  groupName: string;
  coursesList: string;
  selected?: boolean;
}

@Component({
  selector: 'app-tab-paired-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-paired-courses.html',
  styleUrl: './tab-paired-courses.css',
})
export class TabPairedCoursesComponent {
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Paired Groups Data
  readonly pairedGroups = signal<PairedGroupItem[]>([
    {
      id: '1',
      groupName: 'กลุ่มวิชาบัญชี',
      coursesList: 'ACC1101 หลักการบัญชี, ACC1102 การบัญชีขั้นกลาง, ACC1103 การบัญชีต้นทุน',
    },
    {
      id: '2',
      groupName: 'กลุ่มวิชาแคลคูลัส',
      coursesList: 'MTH1101 แคลคูลัส 1, MTH1102 แคลคูลัส 2',
    },
    {
      id: '3',
      groupName: 'กลุ่มวิชาภาษาอังกฤษทักษะสัมพันธ์',
      coursesList: 'ENG1001 ประโยคและย่อหน้า, ENG1002 ความพร้อมในการอ่าน',
    },
  ]);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);

  modalCoursesList: string = '';

  // Master Checkbox
  readonly isAllSelected = computed(() => {
    const list = this.filteredGroups();
    return list.length > 0 && list.every((g) => g.selected);
  });

  readonly selectedCount = computed(() => {
    return this.pairedGroups().filter((g) => g.selected).length;
  });

  // Filtered List
  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.pairedGroups();
    if (!q) return list;

    return list.filter((g) => {
      return g.coursesList.toLowerCase().includes(q) || g.groupName.toLowerCase().includes(q);
    });
  });

  toggleSelectAll(checked: boolean): void {
    const visibleIds = new Set(this.filteredGroups().map((g) => g.id));
    this.pairedGroups.update((list) =>
      list.map((g) => (visibleIds.has(g.id) ? { ...g, selected: checked } : g))
    );
  }

  toggleRowSelect(id: string, checked: boolean): void {
    this.pairedGroups.update((list) =>
      list.map((g) => (g.id === id ? { ...g, selected: checked } : g))
    );
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.modalCoursesList = '';
    this.isModalOpen.set(true);
  }

  openEditModal(item: PairedGroupItem): void {
    this.isEditing.set(true);
    this.editingId.set(item.id);
    this.modalCoursesList = item.coursesList;
    this.isModalOpen.set(true);
  }

  saveGroup(): void {
    if (!this.modalCoursesList.trim()) {
      alert('กรุณาระบุรายวิชาคู่');
      return;
    }

    if (this.isEditing() && this.editingId()) {
      const id = this.editingId()!;
      this.pairedGroups.update((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                coursesList: this.modalCoursesList.trim(),
              }
            : item
        )
      );
    } else {
      const newId = (Math.max(0, ...this.pairedGroups().map((g) => Number(g.id) || 0)) + 1).toString();
      const newGroup: PairedGroupItem = {
        id: newId,
        groupName: `กลุ่มวิชาที่ ${newId}`,
        coursesList: this.modalCoursesList.trim(),
      };
      this.pairedGroups.update((items) => [newGroup, ...items]);
    }

    this.closeModal();
  }

  deleteGroup(id: string): void {
    const target = this.pairedGroups().find((g) => g.id === id);
    if (!target) return;

    if (confirm(`คุณต้องการลบกลุ่มวิชาคู่ "${target.coursesList}" ใช่หรือไม่?\n(การลบจะลบทั้งกลุ่ม)`)) {
      this.pairedGroups.update((list) => list.filter((g) => g.id !== id));
    }
  }

  deleteSelected(): void {
    const count = this.selectedCount();
    if (count === 0) return;

    if (confirm(`คุณต้องการลบ ${count} กลุ่มวิชาคู่ที่เลือก ใช่หรือไม่?`)) {
      this.pairedGroups.update((list) => list.filter((g) => !g.selected));
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
