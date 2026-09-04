export type CoursePrefix = 'A' | 'B' | 'S' | 'F' | 'G';

export interface Course {
  id: string;
  code: string;           // e.g. "A101", "BLG201"
  nameEN: string;
  nameTH: string;
  prefix: CoursePrefix;
  credits: number;
  section: number;
  totalStudents: number;
  description?: string;
}

export const COURSE_PREFIXES: CoursePrefix[] = ['A', 'B', 'S', 'F', 'G'];

export const COURSE_PREFIX_LABELS: Record<CoursePrefix, string> = {
  A: 'A — ภาษาอังกฤษ',
  B: 'B — ภาษาญี่ปุ่น',
  S: 'S — ภาษาสเปน',
  F: 'F — ภาษาฝรั่งเศส',
  G: 'G — ภาษาเยอรมัน',
};
