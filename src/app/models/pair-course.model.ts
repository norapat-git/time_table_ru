export interface PairedCourseDbRow {
  PAIR_COURSE_GROUP_ID: number;
  COURSE_NO: string;
  START_YEAR?: string | null;
  STOP_YEAR?: string | null;
  YEAR_LEVEL?: string | null;
  SEMESTER?: string | null;
  COURSE_NAME_THAI?: string | null;
  COURSE_NAME_ENG_L?: string | null;
  CREDIT?: number | null;
}
