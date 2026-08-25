import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

interface TimetableSlot {
  id: string;
  day: 'จันทร์' | 'อังคาร' | 'พุธ' | 'พฤหัสบดี' | 'ศุกร์' | 'เสาร์' | 'อาทิตย์';
  time: string;
  courseCode: string;
  courseName: string;
  section: number;
  room: string;
  instructor: string;
  totalStudents: number;
}

@Component({
  selector: 'app-tab-timetable-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <span class="material-symbols-rounded title-icon">calendar_month</span>
            จัดการตารางสอน
          </h1>
          <p class="page-subtitle">จัดสรรห้องเรียน วัน-เวลาเรียน และอาจารย์ผู้สอน ประจำภาคเรียนที่ 1/2569</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="simulateRefresh()">
            <span class="material-symbols-rounded" [class.spin]="isLoading()">refresh</span> โหลดใหม่
          </button>
          <button class="btn-primary-action">
            <span class="material-symbols-rounded">add_circle</span> เพิ่มคาบสอน
          </button>
        </div>
      </div>

      <!-- Quick Filter -->
      <div class="filter-card">
        <div class="filter-row">
          <div class="search-box">
            <span class="material-symbols-rounded search-icon">search</span>
            <input class="search-input" type="text" placeholder="ค้นหาจากรหัสวิชา, ห้องเรียน หรือชื่ออาจารย์..." [(ngModel)]="searchQuery" />
          </div>
          <div class="day-pills">
            @for (day of days; track day) {
              <button class="day-pill" [class.active]="selectedDay === day" (click)="selectedDay = day">
                {{ day }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Schedule Table -->
      <div class="card-section">
        @if (isLoading()) {
          <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <app-skeleton variant="rect" width="100%" height="60px" [lines]="4" />
          </div>
        } @else {
          <div class="table-responsive">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>วัน</th>
                  <th>เวลา</th>
                  <th>รหัสวิชา</th>
                  <th>ชื่อรายวิชา</th>
                  <th>Sec</th>
                  <th>ห้องเรียน</th>
                  <th>อาจารย์ผู้สอน</th>
                  <th>นศ.</th>
                  <th style="text-align: right;">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                @for (slot of filteredSlots(); track slot.id) {
                  <tr>
                    <td><span class="day-tag" [attr.data-day]="slot.day">{{ slot.day }}</span></td>
                    <td><strong>{{ slot.time }}</strong></td>
                    <td><span class="course-code">{{ slot.courseCode }}</span></td>
                    <td>{{ slot.courseName }}</td>
                    <td>{{ slot.section }}</td>
                    <td><span class="room-badge">{{ slot.room }}</span></td>
                    <td>{{ slot.instructor }}</td>
                    <td>{{ slot.totalStudents }}</td>
                    <td style="text-align: right;">
                      <button class="btn-icon-action" title="แก้ไข"><span class="material-symbols-rounded">edit</span></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: var(--space-8); max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); }
    .header-content { display: flex; flex-direction: column; gap: var(--space-2); }
    .page-title { display: flex; align-items: center; gap: var(--space-3); font-size: 1.75rem; font-weight: 700; color: var(--navy-800); font-family: var(--font-thai); }
    .title-icon { font-size: 1.75rem; color: var(--navy-700); }
    .page-subtitle { font-size: 0.9rem; color: var(--gray-500); font-family: var(--font-thai); }
    .header-actions { display: flex; gap: var(--space-3); }
    .btn-refresh { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--white); color: var(--navy-700); border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid var(--navy-300); font-family: var(--font-thai); }
    .btn-primary-action { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--navy-800); color: var(--white); border-radius: var(--radius-full); font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: var(--font-thai); }
    .filter-card { background: var(--white); padding: var(--space-4); border-radius: var(--radius-xl); border: 1px solid var(--color-border); margin-bottom: var(--space-6); box-shadow: var(--shadow-sm); }
    .filter-row { display: flex; gap: var(--space-4); align-items: center; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 260px; display: flex; align-items: center; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: 0 var(--space-3); }
    .search-icon { color: var(--navy-400); }
    .search-input { flex: 1; padding: var(--space-3) var(--space-2); border: none; background: transparent; font-family: var(--font-thai); outline: none; }
    .day-pills { display: flex; gap: var(--space-1); flex-wrap: wrap; }
    .day-pill { padding: 0.35rem 0.75rem; border-radius: var(--radius-full); border: 1px solid var(--gray-200); background: var(--white); font-size: 0.8rem; cursor: pointer; font-family: var(--font-thai); }
    .day-pill.active { background: var(--navy-800); color: var(--white); border-color: var(--navy-800); }
    .card-section { background: var(--white); border-radius: var(--radius-xl); border: 1px solid var(--color-border); padding: var(--space-6); box-shadow: var(--shadow-sm); }
    .table-responsive { overflow-x: auto; }
    .schedule-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; font-family: var(--font-thai); }
    .schedule-table th { text-align: left; padding: var(--space-3) var(--space-4); background: var(--gray-50); color: var(--gray-600); border-bottom: 1px solid var(--color-border); font-weight: 600; }
    .schedule-table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); color: var(--gray-800); }
    .day-tag { font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-sm); background: var(--navy-50); color: var(--navy-800); }
    .day-tag[data-day="จันทร์"] { background: #fefcbf; color: #744210; }
    .day-tag[data-day="อังคาร"] { background: #fed7e2; color: #702459; }
    .day-tag[data-day="พุธ"] { background: #c6f6d5; color: #22543d; }
    .day-tag[data-day="พฤหัสบดี"] { background: #feebc8; color: #7b341e; }
    .day-tag[data-day="ศุกร์"] { background: #bee3f8; color: #2a4365; }
    .course-code { font-weight: 700; color: var(--navy-700); }
    .room-badge { background: var(--gray-100); padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; }
    .btn-icon-action { background: none; border: none; color: var(--navy-600); cursor: pointer; padding: 2px; }
    .spin { animation: spin-anim 1s linear infinite; }
    @keyframes spin-anim { 100% { transform: rotate(360deg); } }
  `]
})
export class TabTimetableManageComponent {
  readonly isLoading = signal<boolean>(false);
  searchQuery: string = '';
  selectedDay: string = 'ทั้งหมด';
  days = ['ทั้งหมด', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  readonly slots = signal<TimetableSlot[]>([
    { id: 't1', day: 'จันทร์', time: '09:30 - 11:30', courseCode: 'ENG1001', courseName: 'Basic English Sentences and Paragraphs', section: 1, room: 'LI-301', instructor: 'อาจารย์สมชาย ใจดี', totalStudents: 45 },
    { id: 't2', day: 'จันทร์', time: '13:30 - 15:30', courseCode: 'ENG2001', courseName: 'English Reading and Vocabulary', section: 1, room: 'LI-302', instructor: 'ผศ.สุภาพร รักษาดี', totalStudents: 38 },
    { id: 't3', day: 'อังคาร', time: '09:30 - 11:30', courseCode: 'JPN1011', courseName: 'Japanese Listening and Speaking 1', section: 2, room: 'LI-204', instructor: 'อาจารย์นารีรัตน์ สุขสมบูรณ์', totalStudents: 30 },
    { id: 't4', day: 'พุธ', time: '11:30 - 13:30', courseCode: 'FRE1001', courseName: 'Basic French 1', section: 1, room: 'LI-405', instructor: 'รศ.วิชัย พงษ์ประเสริฐ', totalStudents: 28 },
    { id: 't5', day: 'พฤหัสบดี', time: '09:30 - 11:30', courseCode: 'GER1001', courseName: 'Basic German 1', section: 1, room: 'LI-201', instructor: 'อาจารย์ประสิทธิ์ มั่นคง', totalStudents: 25 },
    { id: 't6', day: 'ศุกร์', time: '13:30 - 15:30', courseCode: 'SPA1001', courseName: 'Basic Spanish 1', section: 1, room: 'LI-203', instructor: 'ผศ.ลลิตา เจริญสุข', totalStudents: 32 },
  ]);

  filteredSlots() {
    return this.slots().filter(s => {
      const matchDay = this.selectedDay === 'ทั้งหมด' || s.day === this.selectedDay;
      const q = this.searchQuery.toLowerCase();
      const matchQuery = !q || s.courseCode.toLowerCase().includes(q) || s.courseName.toLowerCase().includes(q) || s.instructor.toLowerCase().includes(q) || s.room.toLowerCase().includes(q);
      return matchDay && matchQuery;
    });
  }

  simulateRefresh(): void {
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 900);
  }
}
