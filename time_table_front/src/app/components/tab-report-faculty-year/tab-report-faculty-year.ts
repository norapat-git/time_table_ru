import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface ProgramCourseRow {
  id: string;
  faculty: string;
  groupName: string;
  semesterText: string;
  courseCode: string;
  courseName: string;
  schedule: string;
}

@Component({
  selector: 'app-tab-report-faculty-year',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-report-faculty-year.html',
  styleUrl: './tab-report-faculty-year.css',
})
export class TabReportFacultyYearComponent {
  readonly isLoading = signal<boolean>(false);
  readonly selectedFaculty = signal<string>(''); // Default empty to show prompt

  readonly faculties = [
    { id: '', label: '— เลือกคณะ —' },
    { id: 'วิทยาศาสตร์', label: 'คณะวิทยาศาสตร์' },
    { id: 'บริหารธุรกิจ', label: 'คณะบริหารธุรกิจ' },
    { id: 'มนุษยศาสตร์', label: 'คณะมนุษยศาสตร์' },
    { id: 'ศึกษาศาสตร์', label: 'คณะศึกษาศาสตร์' },
  ];

  readonly rawData: ProgramCourseRow[] = [
    {
      id: '1',
      faculty: 'วิทยาศาสตร์',
      groupName: 'สถิติศาสตร์',
      semesterText: 'ภาค 1 / 2569',
      courseCode: 'STAT2101',
      courseName: 'สถิติเบื้องต้น',
      schedule: 'จันทร์ 09:30 - 11:30 (LI-301)',
    },
    {
      id: '2',
      faculty: 'วิทยาศาสตร์',
      groupName: 'สถิติศาสตร์',
      semesterText: 'ภาค 1 / 2569',
      courseCode: 'STAT3102',
      courseName: 'ทฤษฎีความน่าจะเป็น',
      schedule: 'พุธ 13:30 - 15:30 (LI-302)',
    },
    {
      id: '3',
      faculty: 'บริหารธุรกิจ',
      groupName: 'การบัญชี',
      semesterText: 'ภาค 1 / 2569',
      courseCode: 'ACC1101',
      courseName: 'หลักการบัญชี',
      schedule: 'อังคาร 09:30 - 11:30 (LI-204)',
    },
    {
      id: '4',
      faculty: 'บริหารธุรกิจ',
      groupName: 'การบัญชี',
      semesterText: 'ภาค 1 / 2569',
      courseCode: 'ACC1102',
      courseName: 'การบัญชีขั้นกลาง',
      schedule: 'พฤหัสบดี 13:30 - 15:30 (LI-205)',
    },
    {
      id: '5',
      faculty: 'มนุษยศาสตร์',
      groupName: 'ภาษาอังกฤษ',
      semesterText: 'ภาค 1 / 2569',
      courseCode: 'ENG1001',
      courseName: 'ประโยคและย่อหน้าภาษาอังกฤษพื้นฐาน',
      schedule: 'จันทร์ 13:30 - 15:30 (LI-101)',
    },
    {
      id: '6',
      faculty: 'มนุษยศาสตร์',
      groupName: 'ภาษาอังกฤษ',
      semesterText: 'ภาค 1 / 2569',
      courseCode: 'ENG1002',
      courseName: 'ความพร้อมในการอ่านภาษาอังกฤษ',
      schedule: 'ศุกร์ 09:30 - 11:30 (LI-102)',
    },
  ];

  readonly currentRows = computed(() => {
    const fac = this.selectedFaculty();
    if (!fac) return [];
    return this.rawData.filter((r) => r.faculty === fac);
  });

  onFacultyChange(facultyId: string): void {
    this.selectedFaculty.set(facultyId);
    if (facultyId) {
      this.isLoading.set(true);
      setTimeout(() => this.isLoading.set(false), 350);
    }
  }

  printReport(): void {
    window.print();
  }
}
