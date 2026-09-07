export interface ScheduleInstructorItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  INSTRUCTOR_NAME_RU30?: string;
  RANK_NO?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  FACULTY_NO?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
  DEPARTMENT_NO?: string;
  DEPARTMENT_NAME_THAI?: string;
  INSTRUCTOR_TYPE?: string;
  INSTRUCTOR_SEX?: string;
  FLAG_DISPLAY?: string;
  PERSONAL_ID?: string;
  INSERT_DATE?: string;
  USER_INSERT?: string;
  SCHEDULE_COUNT?: number;
  IS_SCHEDULED?: boolean;
}

export interface MasterInstructorOption {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI: string;
  INSTRUCTOR_NAME_ENG?: string;
  INSTRUCTOR_NAME_RU30?: string;
  RANK_NO?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  FACULTY_NO?: string;
  FACULTY_NAME_THAI?: string;
  FACULTY_NAME_SHORT?: string;
}
