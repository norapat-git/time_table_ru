export interface TimetableInstructorMeta {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  INSTRUCTOR_ORD?: string | number;
}

export interface TimetablePairedCourseMeta {
  groupId: number;
  courseNo: string;
  courseNameThai?: string;
  courseNameEng?: string;
  credit?: number;
  startYear?: string;
  stopYear?: string;
  yearLevel?: string;
  semester?: string;
}

export interface TimetableClassItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  DAY_CODE: number;
  TIME_CODE: number;
  ROOM_CODE?: string;
  ROOM_DETAIL?: string;
  INSTR_GROUP?: number;
  INSERT_DATE?: string;
  USER_INSERT?: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
  INSTRUCTORS?: TimetableInstructorMeta[];
  PAIRED_COURSES?: TimetablePairedCourseMeta[] | any[];
  HAS_PAIRED_COURSES?: boolean;
  isMoved?: boolean;
  originalDayCode?: number;
  originalTimeCode?: number;
  hasInstructorConflict?: boolean;
  instructorConflictReason?: string;
}

export interface TimetableDayOption {
  code: number;
  label: string;
  shortLabel: string;
  standardName?: string;
  colorClass: string;
}

export interface TimetableTimeOption {
  code: number;
  TIME_CODE: string;
  TIME_START?: string;
  TIME_END?: string;
  TIME_RU30?: string;
  FLAG_DISPLAY?: number;
  label?: string;
  period?: string;
}

export interface TimetableRoomOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: string;
}

export interface TimetablePrefixOption {
  PREFIX_NAME: string;
  COURSE_COUNT: number;
}

export interface TimetableCourseOption {
  COURSE_NO: string;
  COURSE_NAME_THAI: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
}

export interface TimetableBusyInstructorDetail {
  instructorCode: string;
  instructorName: string;
  courseNo: string;
  courseName?: string;
}

export interface TimetableSlotAvailability {
  dayCode: number;
  timeCode: number;
  dayLabel: string;
  dayShort: string;
  colorClass: string;
  period: string;
  timeLabel?: string;
  isRu30Available?: boolean;
  isBusyInClass?: boolean;
  isAvailable: boolean;
  busyCount: number;
  busyList: TimetableBusyInstructorDetail[];
}

export interface TimetableSlotMoveRecord {
  courseNo: string;
  oldDayCode: number;
  oldTimeCode: number;
  newDayCode: number;
  newTimeCode: number;
  instrGroup?: number;
  roomCode?: string;
}
