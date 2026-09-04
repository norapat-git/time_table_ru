export interface Instructor {
  id: string;
  titleTH: string;          // อาจารย์ / ผู้ช่วยศาสตราจารย์ / รองศาสตราจารย์ ฯลฯ
  titleEN: string;          // Mr. / Mrs. / Dr. / Prof. etc.
  firstNameTH: string;
  lastNameTH: string;
  firstNameEN: string;
  lastNameEN: string;
  email: string;
  phone?: string;
  department: string;
  specializations: string[];
  avatarUrl?: string;
}

export function getInstructorFullNameTH(instructor: Instructor): string {
  return `${instructor.titleTH}${instructor.firstNameTH} ${instructor.lastNameTH}`;
}

export function getInstructorFullNameEN(instructor: Instructor): string {
  return `${instructor.titleEN} ${instructor.firstNameEN} ${instructor.lastNameEN}`;
}
