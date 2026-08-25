import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface OfferedReportItem {
  id: string;
  code: string;
  name: string;
  credits?: number;
  department?: string;
}

@Component({
  selector: 'app-tab-report-offered-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-report-offered-courses.html',
  styleUrl: './tab-report-offered-courses.css',
})
export class TabReportOfferedCoursesComponent {
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  readonly items = signal<OfferedReportItem[]>([
    { id: '1', code: 'ACC1101', name: 'หลักการบัญชี', credits: 3, department: 'บริหารธุรกิจ' },
    { id: '2', code: 'ACC1102', name: 'การบัญชีขั้นกลาง', credits: 3, department: 'บริหารธุรกิจ' },
    { id: '3', code: 'STAT2101', name: 'สถิติเบื้องต้น', credits: 3, department: 'วิทยาศาสตร์' },
    { id: '4', code: 'ENG1001', name: 'ประโยคและย่อหน้าภาษาอังกฤษพื้นฐาน', credits: 3, department: 'ภาษาอังกฤษ' },
    { id: '5', code: 'ENG1002', name: 'ความพร้อมในการอ่านภาษาอังกฤษ', credits: 3, department: 'ภาษาอังกฤษ' },
    { id: '6', code: 'JPN1011', name: 'การฟังและการพูดภาษาญี่ปุ่น 1', credits: 3, department: 'ภาษาญี่ปุ่น' },
    { id: '7', code: 'FRE1001', name: 'ภาษาฝรั่งเศสเบื้องต้น 1', credits: 3, department: 'ภาษาฝรั่งเศส' },
    { id: '8', code: 'GER1001', name: 'ภาษาเยอรมัน 1', credits: 3, department: 'ภาษาเยอรมัน' },
  ]);

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.items();
    if (!q) return list;

    return list.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  });

  printReport(): void {
    window.print();
  }

  simulateRefresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 500);
  }
}
