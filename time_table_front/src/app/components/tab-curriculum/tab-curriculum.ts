import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface CurriculumGroupItem {
  id: string;
  faculty: string;
  groupName: string;
  subGroupName: string;
  totalRequiredCourses?: number;
  description?: string;
}

@Component({
  selector: 'app-tab-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-curriculum.html',
  styleUrl: './tab-curriculum.css',
})
export class TabCurriculumComponent {
  readonly isLoading = signal<boolean>(false);

  // Filters
  selectedFaculty = signal<string>('ALL');
  selectedGroup = signal<string>('ALL');

  // Faculties & Groups filter options
  readonly faculties = [
    { id: 'ALL', label: 'คณะ — ทั้งหมด' },
    { id: 'วิทยาศาสตร์', label: 'คณะวิทยาศาสตร์' },
    { id: 'บริหารธุรกิจ', label: 'คณะบริหารธุรกิจ' },
    { id: 'มนุษยศาสตร์', label: 'คณะมนุษยศาสตร์' },
    { id: 'ศึกษาศาสตร์', label: 'คณะศึกษาศาสตร์' },
  ];

  readonly groupOptions = [
    { id: 'ALL', label: 'กลุ่มวิชา — ทั้งหมด' },
    { id: 'สถิติศาสตร์', label: 'สถิติศาสตร์' },
    { id: 'คณิตศาสตร์', label: 'คณิตศาสตร์' },
    { id: 'ภาษาอังกฤษ', label: 'ภาษาอังกฤษ' },
    { id: 'การบัญชี', label: 'การบัญชี' },
  ];

  // Data
  readonly items = signal<CurriculumGroupItem[]>([
    {
      id: '1',
      faculty: 'วิทยาศาสตร์',
      groupName: 'สถิติศาสตร์',
      subGroupName: 'สถิติศาสตร์คณิตศาสตร์ประกันภัย',
      totalRequiredCourses: 12,
      description: 'กลุ่มวิชาเอกบังคับสำหรับหลักสูตรสถิติศาสตร์ประยุกต์และประกันภัย',
    },
    {
      id: '2',
      faculty: 'บริหารธุรกิจ',
      groupName: 'การบัญชี',
      subGroupName: 'การบัญชีการเงินและการสอบบัญชี',
      totalRequiredCourses: 15,
      description: 'กลุ่มวิชาเฉพาะด้านการบัญชีการเงินสำหรับผู้สอบบัญชีรับอนุญาต',
    },
    {
      id: '3',
      faculty: 'มนุษยศาสตร์',
      groupName: 'ภาษาอังกฤษ',
      subGroupName: 'ภาษาอังกฤษเพื่อการสื่อสารสากล',
      totalRequiredCourses: 10,
      description: 'กลุ่มวิชาทักษะภาษาอังกฤษเชิงบูรณาการ',
    },
    {
      id: '4',
      faculty: 'วิทยาศาสตร์',
      groupName: 'คณิตศาสตร์',
      subGroupName: 'คณิตศาสตร์บริสุทธิ์และคอมพิวเตอร์',
      totalRequiredCourses: 14,
      description: 'กลุ่มวิชาพื้นฐานทางคณิตศาสตร์และการวิเคราะห์เชิงตัวเลข',
    },
  ]);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly selectedItem = signal<CurriculumGroupItem | null>(null);

  // Form Fields
  modalFaculty: string = 'วิทยาศาสตร์';
  modalGroup: string = 'สถิติศาสตร์';
  modalSubGroup: string = '';
  modalDesc: string = '';

  // Filtered List
  readonly filteredItems = computed(() => {
    const fac = this.selectedFaculty();
    const grp = this.selectedGroup();
    let list = this.items();

    if (fac !== 'ALL') {
      list = list.filter((i) => i.faculty === fac);
    }
    if (grp !== 'ALL') {
      list = list.filter((i) => i.groupName === grp);
    }
    return list;
  });

  openAddModal(): void {
    this.isEditing.set(false);
    this.selectedItem.set(null);
    this.modalFaculty = 'วิทยาศาสตร์';
    this.modalGroup = 'สถิติศาสตร์';
    this.modalSubGroup = '';
    this.modalDesc = '';
    this.isModalOpen.set(true);
  }

  openEditModal(item: CurriculumGroupItem): void {
    this.isEditing.set(true);
    this.selectedItem.set(item);
    this.modalFaculty = item.faculty;
    this.modalGroup = item.groupName;
    this.modalSubGroup = item.subGroupName;
    this.modalDesc = item.description || '';
    this.isModalOpen.set(true);
  }

  openDetailModal(item: CurriculumGroupItem): void {
    this.selectedItem.set(item);
    this.isDetailModalOpen.set(true);
  }

  saveItem(): void {
    if (!this.modalGroup.trim() || !this.modalSubGroup.trim()) {
      alert('กรุณากรอกกลุ่มวิชาและกลุ่มวิชาย่อย');
      return;
    }

    if (this.isEditing() && this.selectedItem()) {
      const id = this.selectedItem()!.id;
      this.items.update((list) =>
        list.map((it) =>
          it.id === id
            ? {
                ...it,
                faculty: this.modalFaculty,
                groupName: this.modalGroup.trim(),
                subGroupName: this.modalSubGroup.trim(),
                description: this.modalDesc.trim(),
              }
            : it
        )
      );
    } else {
      const newId = (Math.max(0, ...this.items().map((i) => Number(i.id) || 0)) + 1).toString();
      const newItem: CurriculumGroupItem = {
        id: newId,
        faculty: this.modalFaculty,
        groupName: this.modalGroup.trim(),
        subGroupName: this.modalSubGroup.trim(),
        totalRequiredCourses: 10,
        description: this.modalDesc.trim(),
      };
      this.items.update((list) => [newItem, ...list]);
    }

    this.closeModal();
  }

  deleteItem(id: string): void {
    const target = this.items().find((i) => i.id === id);
    if (!target) return;

    if (confirm(`คุณต้องการลบกลุ่มวิชา "${target.groupName} - ${target.subGroupName}" ใช่หรือไม่?`)) {
      this.items.update((list) => list.filter((i) => i.id !== id));
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isDetailModalOpen.set(false);
  }

  simulateRefresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 600);
  }
}
