import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface ScheduleSlot {
  code: string;
  instructor: string;
}

export interface DaySchedule {
  day: 'จันทร์' | 'อังคาร' | 'พุธ' | 'พฤหัสบดี' | 'ศุกร์';
  slots: (ScheduleSlot | null)[]; // 6 slots corresponding to the 6 time periods
}

@Component({
  selector: 'app-tab-student-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-student-schedule.html',
  styleUrl: './tab-student-schedule.css',
})
export class TabStudentScheduleComponent {
  readonly isLoading = signal<boolean>(false);
  readonly selectedRoom = signal<string>('ห้อง 1');

  readonly rooms = ['ห้อง 1', 'ห้อง 2', 'ห้อง 3', 'LI-301', 'LI-302', 'LI-405'];

  readonly timeHeaders = [
    '08:00–09:15',
    '09:25–10:40',
    '10:50–12:05',
    '12:15–13:30',
    '13:40–14:55',
    '15:05–16:20',
  ];

  // Schedules indexed by room
  readonly roomSchedules: Record<string, DaySchedule[]> = {
    'ห้อง 1': [
      {
        day: 'จันทร์',
        slots: [
          { code: 'ACC1101', instructor: 'อ. สมชาย ใจดี' },
          null,
          null,
          null,
          null,
          null,
        ],
      },
      { day: 'อังคาร', slots: [null, null, null, null, null, null] },
      { day: 'พุธ', slots: [null, null, null, null, null, null] },
      { day: 'พฤหัสบดี', slots: [null, null, null, null, null, null] },
      { day: 'ศุกร์', slots: [null, null, null, null, null, null] },
    ],
    'ห้อง 2': [
      { day: 'จันทร์', slots: [null, null, null, null, null, null] },
      {
        day: 'อังคาร',
        slots: [
          null,
          { code: 'ENG1001', instructor: 'ผศ. สุภาพร รักษาดี' },
          null,
          null,
          null,
          null,
        ],
      },
      { day: 'พุธ', slots: [null, null, null, null, null, null] },
      {
        day: 'พฤหัสบดี',
        slots: [
          null,
          null,
          { code: 'JPN1011', instructor: 'อ. นารีรัตน์ สุขสมบูรณ์' },
          null,
          null,
          null,
        ],
      },
      { day: 'ศุกร์', slots: [null, null, null, null, null, null] },
    ],
    'LI-301': [
      {
        day: 'จันทร์',
        slots: [
          null,
          { code: 'ACC1102', instructor: 'อ. พิมพ์ใจ รักเรียน' },
          null,
          null,
          { code: 'STAT2101', instructor: 'อ. สมชาย ใจดี' },
          null,
        ],
      },
      { day: 'อังคาร', slots: [null, null, null, null, null, null] },
      {
        day: 'พุธ',
        slots: [
          { code: 'FRE1001', instructor: 'รศ. วิชัย พงษ์ประเสริฐ' },
          null,
          null,
          null,
          null,
          null,
        ],
      },
      { day: 'พฤหัสบดี', slots: [null, null, null, null, null, null] },
      { day: 'ศุกร์', slots: [null, null, null, null, null, null] },
    ],
  };

  readonly currentSchedule = computed<DaySchedule[]>(() => {
    const room = this.selectedRoom();
    return (
      this.roomSchedules[room] || [
        { day: 'จันทร์', slots: [null, null, null, null, null, null] },
        { day: 'อังคาร', slots: [null, null, null, null, null, null] },
        { day: 'พุธ', slots: [null, null, null, null, null, null] },
        { day: 'พฤหัสบดี', slots: [null, null, null, null, null, null] },
        { day: 'ศุกร์', slots: [null, null, null, null, null, null] },
      ]
    );
  });

  onRoomChange(room: string): void {
    this.selectedRoom.set(room);
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 300);
  }

  printSchedule(): void {
    window.print();
  }
}
