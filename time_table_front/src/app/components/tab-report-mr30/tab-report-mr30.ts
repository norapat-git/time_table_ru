import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface Mr30Row {
  id: string;
  faculty: string;
  instructorName: string;
  courseText: string;
  scheduleText: string;
}

@Component({
  selector: 'app-tab-report-mr30',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-report-mr30.html',
  styleUrl: './tab-report-mr30.css',
})
export class TabReportMr30Component {
  readonly isLoading = signal<boolean>(false);
  readonly selectedFaculty = signal<string>(''); // Default unselected

  readonly faculties = [
    { id: '', label: '— เลือกคณะ —' },
    { id: 'วิทยาศาสตร์', label: 'คณะวิทยาศาสตร์' },
    { id: 'บริหารธุรกิจ', label: 'คณะบริหารธุรกิจ' },
    { id: 'มนุษยศาสตร์', label: 'คณะมนุษยศาสตร์' },
    { id: 'ศึกษาศาสตร์', label: 'คณะศึกษาศาสตร์' },
  ];

  readonly rawMr30Data: Mr30Row[] = [
    {
      id: '1',
      faculty: 'วิทยาศาสตร์',
      instructorName: 'อ. สมชาย ใจดี',
      courseText: 'ACC1101 หลักการบัญชี, STAT2101 สถิติเบื้องต้น',
      scheduleText: 'จันทร์ 09:30 - 11:30 (LI-301), พุธ 13:30 - 15:30 (LI-302)',
    },
    {
      id: '2',
      faculty: 'วิทยาศาสตร์',
      instructorName: 'ผศ. สุภาพร รักษาดี',
      courseText: 'STAT3102 ทฤษฎีความน่าจะเป็น',
      scheduleText: 'อังคาร 09:30 - 11:30 (LI-204)',
    },
    {
      id: '3',
      faculty: 'บริหารธุรกิจ',
      instructorName: 'อ. พิมพ์ใจ รักเรียน',
      courseText: 'ACC1102 การบัญชีขั้นกลาง, ACC1103 การบัญชีต้นทุน',
      scheduleText: 'พฤหัสบดี 09:30 - 11:30 (LI-205), ศุกร์ 13:30 - 15:30 (LI-206)',
    },
    {
      id: '4',
      faculty: 'มนุษยศาสตร์',
      instructorName: 'อ. นารีรัตน์ สุขสมบูรณ์',
      courseText: 'JPN1011 ภาษาญี่ปุ่น 1, JPN1012 ภาษาญี่ปุ่น 2',
      scheduleText: 'จันทร์ 13:30 - 15:30 (LI-101), พุธ 09:30 - 11:30 (LI-102)',
    },
    {
      id: '5',
      faculty: 'มนุษยศาสตร์',
      instructorName: 'รศ. วิชัย พงษ์ประเสริฐ',
      courseText: 'FRE1001 ภาษาฝรั่งเศส 1, FRE1002 ภาษาฝรั่งเศส 2',
      scheduleText: 'อังคาร 13:30 - 15:30 (LI-405), ศุกร์ 09:30 - 11:30 (LI-406)',
    },
  ];

  readonly currentRows = computed(() => {
    const fac = this.selectedFaculty();
    if (!fac) return [];
    return this.rawMr30Data.filter((r) => r.faculty === fac);
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
