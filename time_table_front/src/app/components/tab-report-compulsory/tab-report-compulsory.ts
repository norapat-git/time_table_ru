import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface CompulsoryReportRow {
  id: string;
  faculty: string;
  groupName: string;
  subGroupName: string;
  courseCode: string;
  courseName: string;
}

@Component({
  selector: 'app-tab-report-compulsory',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-report-compulsory.html',
  styleUrl: './tab-report-compulsory.css',
})
export class TabReportCompulsoryComponent {
  readonly isLoading = signal<boolean>(false);
  readonly selectedFaculty = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  readonly faculties = [
    { id: 'ALL', label: 'คณะ — ทั้งหมด' },
    { id: 'วิทยาศาสตร์', label: 'คณะวิทยาศาสตร์' },
    { id: 'บริหารธุรกิจ', label: 'คณะบริหารธุรกิจ' },
    { id: 'มนุษยศาสตร์', label: 'คณะมนุษยศาสตร์' },
    { id: 'ศึกษาศาสตร์', label: 'คณะศึกษาศาสตร์' },
  ];

  readonly data = signal<CompulsoryReportRow[]>([
    {
      id: '1',
      faculty: 'วิทยาศาสตร์',
      groupName: 'สถิติศาสตร์',
      subGroupName: 'สถิติศาสตร์คณิตศาสตร์ประกันภัย',
      courseCode: 'STAT2101',
      courseName: 'สถิติเบื้องต้น',
    },
    {
      id: '2',
      faculty: 'วิทยาศาสตร์',
      groupName: 'สถิติศาสตร์',
      subGroupName: 'สถิติศาสตร์คณิตศาสตร์ประกันภัย',
      courseCode: 'STAT3102',
      courseName: 'ทฤษฎีความน่าจะเป็น',
    },
    {
      id: '3',
      faculty: 'บริหารธุรกิจ',
      groupName: 'การบัญชี',
      subGroupName: 'การบัญชีการเงินและการสอบบัญชี',
      courseCode: 'ACC1101',
      courseName: 'หลักการบัญชี',
    },
    {
      id: '4',
      faculty: 'บริหารธุรกิจ',
      groupName: 'การบัญชี',
      subGroupName: 'การบัญชีการเงินและการสอบบัญชี',
      courseCode: 'ACC1102',
      courseName: 'การบัญชีขั้นกลาง',
    },
    {
      id: '5',
      faculty: 'มนุษยศาสตร์',
      groupName: 'ภาษาอังกฤษ',
      subGroupName: 'ภาษาอังกฤษเพื่อการสื่อสารสากล',
      courseCode: 'ENG1001',
      courseName: 'ประโยคและย่อหน้าภาษาอังกฤษพื้นฐาน',
    },
    {
      id: '6',
      faculty: 'มนุษยศาสตร์',
      groupName: 'ภาษาอังกฤษ',
      subGroupName: 'ภาษาอังกฤษเพื่อการสื่อสารสากล',
      courseCode: 'ENG1002',
      courseName: 'ความพร้อมในการอ่านภาษาอังกฤษ',
    },
  ]);

  readonly filteredData = computed(() => {
    const fac = this.selectedFaculty();
    const q = this.searchQuery().trim().toLowerCase();
    let list = this.data();

    if (fac !== 'ALL') {
      list = list.filter((r) => r.faculty === fac);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.faculty.toLowerCase().includes(q) ||
          r.groupName.toLowerCase().includes(q) ||
          r.subGroupName.toLowerCase().includes(q) ||
          r.courseCode.toLowerCase().includes(q) ||
          r.courseName.toLowerCase().includes(q)
      );
    }
    return list;
  });

  printReport(): void {
    window.print();
  }

  simulateRefresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 500);
  }
}
