import { Injectable, signal, computed } from '@angular/core';
import { Course, CoursePrefix } from '../models/course.model';

const MOCK_COURSES: Course[] = [
  // A — English
  { id: 'a001', code: 'A101', nameEN: 'English for Communication 1', nameTH: 'ภาษาอังกฤษเพื่อการสื่อสาร 1', prefix: 'A', credits: 3, section: 1, totalStudents: 40 },
  { id: 'a002', code: 'A102', nameEN: 'English for Communication 2', nameTH: 'ภาษาอังกฤษเพื่อการสื่อสาร 2', prefix: 'A', credits: 3, section: 2, totalStudents: 38 },
  { id: 'a003', code: 'A201', nameEN: 'Academic English Writing', nameTH: 'การเขียนภาษาอังกฤษเชิงวิชาการ', prefix: 'A', credits: 3, section: 1, totalStudents: 35 },
  { id: 'a004', code: 'A202', nameEN: 'English for Business', nameTH: 'ภาษาอังกฤษเพื่อธุรกิจ', prefix: 'A', credits: 3, section: 3, totalStudents: 42 },
  { id: 'a005', code: 'A301', nameEN: 'Advanced English Reading', nameTH: 'การอ่านภาษาอังกฤษขั้นสูง', prefix: 'A', credits: 3, section: 1, totalStudents: 30 },
  { id: 'a006', code: 'A302', nameEN: 'English Presentation Skills', nameTH: 'ทักษะการนำเสนอภาษาอังกฤษ', prefix: 'A', credits: 3, section: 2, totalStudents: 28 },
  { id: 'a007', code: 'A401', nameEN: 'TOEIC Preparation', nameTH: 'เตรียมสอบ TOEIC', prefix: 'A', credits: 3, section: 4, totalStudents: 50 },

  // B — Japanese
  { id: 'b001', code: 'B101', nameEN: 'Japanese 1', nameTH: 'ภาษาญี่ปุ่น 1', prefix: 'B', credits: 3, section: 1, totalStudents: 35 },
  { id: 'b002', code: 'B102', nameEN: 'Japanese 2', nameTH: 'ภาษาญี่ปุ่น 2', prefix: 'B', credits: 3, section: 1, totalStudents: 30 },
  { id: 'b003', code: 'B201', nameEN: 'Japanese Reading and Writing', nameTH: 'การอ่านและการเขียนภาษาญี่ปุ่น', prefix: 'B', credits: 3, section: 2, totalStudents: 25 },
  { id: 'b004', code: 'B202', nameEN: 'Japanese for Business', nameTH: 'ภาษาญี่ปุ่นเพื่อธุรกิจ', prefix: 'B', credits: 3, section: 1, totalStudents: 20 },
  { id: 'b005', code: 'B301', nameEN: 'Advanced Japanese Communication', nameTH: 'การสื่อสารภาษาญี่ปุ่นขั้นสูง', prefix: 'B', credits: 3, section: 1, totalStudents: 18 },

  // S — Spanish
  { id: 's001', code: 'S101', nameEN: 'Spanish 1', nameTH: 'ภาษาสเปน 1', prefix: 'S', credits: 3, section: 1, totalStudents: 32 },
  { id: 's002', code: 'S102', nameEN: 'Spanish 2', nameTH: 'ภาษาสเปน 2', prefix: 'S', credits: 3, section: 1, totalStudents: 28 },
  { id: 's003', code: 'S201', nameEN: 'Spanish Conversation', nameTH: 'การสนทนาภาษาสเปน', prefix: 'S', credits: 3, section: 2, totalStudents: 24 },
  { id: 's004', code: 'S202', nameEN: 'Spanish Culture and Society', nameTH: 'วัฒนธรรมและสังคมสเปน', prefix: 'S', credits: 3, section: 1, totalStudents: 20 },

  // F — French
  { id: 'f001', code: 'F101', nameEN: 'French 1', nameTH: 'ภาษาฝรั่งเศส 1', prefix: 'F', credits: 3, section: 1, totalStudents: 30 },
  { id: 'f002', code: 'F102', nameEN: 'French 2', nameTH: 'ภาษาฝรั่งเศส 2', prefix: 'F', credits: 3, section: 1, totalStudents: 26 },
  { id: 'f003', code: 'F201', nameEN: 'French Reading and Composition', nameTH: 'การอ่านและการเรียบเรียงภาษาฝรั่งเศส', prefix: 'F', credits: 3, section: 1, totalStudents: 22 },
  { id: 'f004', code: 'F202', nameEN: 'French for Tourism', nameTH: 'ภาษาฝรั่งเศสเพื่อการท่องเที่ยว', prefix: 'F', credits: 3, section: 2, totalStudents: 18 },

  // G — German
  { id: 'g001', code: 'G101', nameEN: 'German 1', nameTH: 'ภาษาเยอรมัน 1', prefix: 'G', credits: 3, section: 1, totalStudents: 28 },
  { id: 'g002', code: 'G102', nameEN: 'German 2', nameTH: 'ภาษาเยอรมัน 2', prefix: 'G', credits: 3, section: 1, totalStudents: 24 },
  { id: 'g003', code: 'G201', nameEN: 'German Conversation and Grammar', nameTH: 'การสนทนาและไวยากรณ์ภาษาเยอรมัน', prefix: 'G', credits: 3, section: 2, totalStudents: 20 },
  { id: 'g004', code: 'G301', nameEN: 'German for Science and Technology', nameTH: 'ภาษาเยอรมันเพื่อวิทยาศาสตร์และเทคโนโลยี', prefix: 'G', credits: 3, section: 1, totalStudents: 15 },
];

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly _allCourses = signal<Course[]>(MOCK_COURSES);
  private readonly _selectedPrefix = signal<CoursePrefix | null>(null);
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedCourse = signal<Course | null>(null);

  readonly allCourses = this._allCourses.asReadonly();
  readonly selectedPrefix = this._selectedPrefix.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedCourse = this._selectedCourse.asReadonly();

  readonly filteredCourses = computed(() => {
    const prefix = this._selectedPrefix();
    const query = this._searchQuery().toLowerCase().trim();
    let courses = this._allCourses();

    if (prefix) {
      courses = courses.filter(c => c.prefix === prefix);
    }
    if (query) {
      courses = courses.filter(c =>
        c.code.toLowerCase().includes(query) ||
        c.nameEN.toLowerCase().includes(query) ||
        c.nameTH.includes(query)
      );
    }
    return courses;
  });

  setPrefix(prefix: CoursePrefix | null): void {
    this._selectedPrefix.set(prefix);
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  selectCourse(course: Course | null): void {
    this._selectedCourse.set(course);
  }

  getCourseById(id: string): Course | undefined {
    return this._allCourses().find(c => c.id === id);
  }
}
