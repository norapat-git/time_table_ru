import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface InstructorItem {
  id: string;
  title: string;
  name: string;
  faculty: string;
  department: string;
  email?: string;
  specialization?: string;
}

@Component({
  selector: 'app-tab-instructor',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-instructor.html',
  styleUrl: './tab-instructor.css',
})
export class TabInstructorComponent {
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Instructors Data
  readonly instructors = signal<InstructorItem[]>([
    {
      id: '1',
      title: 'อ.',
      name: 'สมชาย ใจดี',
      faculty: 'วิทยาศาสตร์',
      department: 'วิทยาการคอมพิวเตอร์',
      email: 'somchai.j@li.university.ac.th',
      specialization: 'ภาษาอังกฤษเพื่อวิทยาศาสตร์และคอมพิวเตอร์',
    },
    {
      id: '2',
      title: 'อ.',
      name: 'พิมพ์ใจ รักเรียน',
      faculty: 'บริหารธุรกิจ',
      department: 'การจัดการและการตลาด',
      email: 'pimjai.r@li.university.ac.th',
      specialization: 'ภาษาอังกฤษธุรกิจ และการเจรจาต่อรอง',
    },
    {
      id: '3',
      title: 'ผศ.',
      name: 'สุภาพร รักษาดี',
      faculty: 'มนุษยศาสตร์',
      department: 'ภาษาอังกฤษ',
      email: 'supaporn.r@li.university.ac.th',
      specialization: 'การอ่านเชิงวิชาการ และวรรณกรรม',
    },
    {
      id: '4',
      title: 'อ.',
      name: 'นารีรัตน์ สุขสมบูรณ์',
      faculty: 'มนุษยศาสตร์',
      department: 'ภาษาญี่ปุ่น',
      email: 'nareerat.s@li.university.ac.th',
      specialization: 'การสื่อสารภาษาญี่ปุ่นและวัฒนธรรม',
    },
    {
      id: '5',
      title: 'รศ.',
      name: 'วิชัย พงษ์ประเสริฐ',
      faculty: 'มนุษยศาสตร์',
      department: 'ภาษาฝรั่งเศส',
      email: 'wichai.p@li.university.ac.th',
      specialization: 'ภาษาศาสตร์ภาษาฝรั่งเศส และการแปล',
    },
  ]);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly selectedInstructor = signal<InstructorItem | null>(null);

  // Form Fields
  modalTitle: string = 'อ.';
  modalName: string = '';
  modalFaculty: string = 'วิทยาศาสตร์';
  modalDept: string = '';
  modalEmail: string = '';
  modalSpec: string = '';

  // Filtered List
  readonly filteredInstructors = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.instructors();
    if (!q) return list;

    return list.filter((i) => {
      const full = `${i.title} ${i.name}`.toLowerCase();
      const fac = i.faculty.toLowerCase();
      const dept = i.department.toLowerCase();
      return full.includes(q) || fac.includes(q) || dept.includes(q);
    });
  });

  openAddModal(): void {
    this.isEditing.set(false);
    this.selectedInstructor.set(null);
    this.modalTitle = 'อ.';
    this.modalName = '';
    this.modalFaculty = 'วิทยาศาสตร์';
    this.modalDept = '';
    this.modalEmail = '';
    this.modalSpec = '';
    this.isModalOpen.set(true);
  }

  openEditModal(item: InstructorItem): void {
    this.isEditing.set(true);
    this.selectedInstructor.set(item);
    this.modalTitle = item.title;
    this.modalName = item.name;
    this.modalFaculty = item.faculty;
    this.modalDept = item.department;
    this.modalEmail = item.email || '';
    this.modalSpec = item.specialization || '';
    this.isModalOpen.set(true);
  }

  openDetailModal(item: InstructorItem): void {
    this.selectedInstructor.set(item);
    this.isDetailModalOpen.set(true);
  }

  saveInstructor(): void {
    if (!this.modalName.trim()) {
      alert('กรุณากรอกชื่ออาจารย์ผู้สอน');
      return;
    }

    if (this.isEditing() && this.selectedInstructor()) {
      const id = this.selectedInstructor()!.id;
      this.instructors.update((list) =>
        list.map((it) =>
          it.id === id
            ? {
                ...it,
                title: this.modalTitle,
                name: this.modalName.trim(),
                faculty: this.modalFaculty,
                department: this.modalDept.trim() || 'ทั่วไป',
                email: this.modalEmail.trim(),
                specialization: this.modalSpec.trim(),
              }
            : it
        )
      );
    } else {
      const newId = (Math.max(0, ...this.instructors().map((i) => Number(i.id) || 0)) + 1).toString();
      const newIns: InstructorItem = {
        id: newId,
        title: this.modalTitle,
        name: this.modalName.trim(),
        faculty: this.modalFaculty,
        department: this.modalDept.trim() || 'ทั่วไป',
        email: this.modalEmail.trim(),
        specialization: this.modalSpec.trim(),
      };
      this.instructors.update((list) => [newIns, ...list]);
    }

    this.closeModal();
  }

  deleteInstructor(id: string): void {
    const target = this.instructors().find((i) => i.id === id);
    if (!target) return;

    if (confirm(`คุณต้องการลบข้อมูลอาจารย์ "${target.title} ${target.name}" ใช่หรือไม่?`)) {
      this.instructors.update((list) => list.filter((i) => i.id !== id));
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
