export interface FacultyItem {
  FACULTY_NO: string;
  FACULTY_NAME_THAI: string;
  FACULTY_NAME_SHORT?: string;
  FACULTY_NAME_ENG?: string;
}

export interface ProgramGroupItem {
  FACULTY_NO: string;
  GROUP_NO: string;
  GROUP_NAME: string;
}

export interface ProgramSubGroupItem {
  FACULTY_NO: string;
  GROUP_NO: string;
  SUB_GROUP_NO: string;
  SUB_GROUP_NAME: string;
}

export interface CurriculumCourseRow {
  FACULTY_NO: string;
  GROUP_NO: string;
  SUB_GROUP_NO?: string;
  YEAR_LEVEL: string;
  SEMESTER: string;
  COURSE_NO: string;
  YEAR_ENROLL?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  GROUP_NAME?: string;
  SUB_GROUP_NAME?: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG_L?: string;
  CREDIT?: number;
  COURSE_REMARK?: string;
}
