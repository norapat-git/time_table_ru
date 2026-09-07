export interface Mr30FacultyOption {
  FACULTY_NO: string;
  FACULTY_NAME_THAI: string;
  FACULTY_NAME_SHORT?: string;
}

export interface Mr30Instructor {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  SEQUENCE_INSTRUCTOR?: number;
}

export interface Mr30ReportItem {
  key: string;
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
  SECTION_NO: number;
  COURSE_METHOD?: number;
  COURSE_METHOD_NUMBER?: number;
  DAY_CODE: number;
  TIME_CODE: number;
  TIME_START?: string;
  TIME_END?: string;
  PERIOD: string;
  BUILDING_CODE?: string;
  ROOM_CODE?: string;
  FACULTY_NO?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  INSTRUCTORS: Mr30Instructor[];
}

export interface Mr30ReportResponse {
  success: boolean;
  results: Mr30ReportItem[];
  summary: {
    totalCourses: number;
    totalSlots: number;
    totalInstructors: number;
    totalFaculties: number;
  };
}
