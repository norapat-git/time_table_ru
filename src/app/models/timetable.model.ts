export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const DAY_LABELS: Record<DayOfWeek, string> = {
  Mon: 'จันทร์',
  Tue: 'อังคาร',
  Wed: 'พุธ',
  Thu: 'พฤหัสบดี',
  Fri: 'ศุกร์',
  Sat: 'เสาร์',
  Sun: 'อาทิตย์',
};

export interface TimeSlot {
  day: DayOfWeek;
  startTime: string;   // "08:00"
  endTime: string;     // "10:00"
}

export interface TimetableEntry {
  id: string;
  courseId: string;
  instructorId: string;
  timeSlot: TimeSlot;
  room: string;
  building?: string;
  semester: string;      // e.g. "1/2567"
  academicYear: string;  // e.g. "2567"
  notes?: string;
}

export interface Semester {
  label: string;         // "1/2567"
  year: string;          // "2567"
  term: '1' | '2' | 'S';
  startDate: string;     // ISO date string
  endDate: string;
}
