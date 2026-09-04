import { Injectable, signal } from '@angular/core';
import { Instructor } from '../models/instructor.model';

const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: 'i001',
    titleTH: 'อาจารย์',
    titleEN: 'Mr.',
    firstNameTH: 'สมชาย',
    lastNameTH: 'ใจดี',
    firstNameEN: 'Somchai',
    lastNameEN: 'Jaidee',
    email: 'somchai.j@li.university.ac.th',
    department: 'ภาษาอังกฤษ',
    specializations: ['English Communication', 'Business English', 'TOEIC'],
  },
  {
    id: 'i002',
    titleTH: 'ผู้ช่วยศาสตราจารย์',
    titleEN: 'Asst. Prof.',
    firstNameTH: 'สุภาพร',
    lastNameTH: 'รักษาดี',
    firstNameEN: 'Supaporn',
    lastNameEN: 'Raksadee',
    email: 'supaporn.r@li.university.ac.th',
    department: 'ภาษาอังกฤษ',
    specializations: ['Academic Writing', 'Literature', 'Reading'],
  },
  {
    id: 'i003',
    titleTH: 'อาจารย์',
    titleEN: 'Ms.',
    firstNameTH: 'นารีรัตน์',
    lastNameTH: 'สุขสมบูรณ์',
    firstNameEN: 'Nareerat',
    lastNameEN: 'Suksomboon',
    email: 'nareerat.s@li.university.ac.th',
    department: 'ภาษาญี่ปุ่น',
    specializations: ['Japanese Communication', 'Japanese Culture', 'JLPT N2'],
  },
  {
    id: 'i004',
    titleTH: 'รองศาสตราจารย์',
    titleEN: 'Assoc. Prof.',
    firstNameTH: 'วิชัย',
    lastNameTH: 'พงษ์ประเสริฐ',
    firstNameEN: 'Wichai',
    lastNameEN: 'Phongprasert',
    email: 'wichai.p@li.university.ac.th',
    department: 'ภาษาฝรั่งเศส',
    specializations: ['French Literature', 'French Linguistics', 'Translation'],
  },
  {
    id: 'i005',
    titleTH: 'อาจารย์',
    titleEN: 'Mr.',
    firstNameTH: 'ประสิทธิ์',
    lastNameTH: 'มั่นคง',
    firstNameEN: 'Prasit',
    lastNameEN: 'Munkong',
    email: 'prasit.m@li.university.ac.th',
    department: 'ภาษาเยอรมัน',
    specializations: ['German Grammar', 'German for Science', 'Translation'],
  },
  {
    id: 'i006',
    titleTH: 'ผู้ช่วยศาสตราจารย์',
    titleEN: 'Asst. Prof.',
    firstNameTH: 'ลลิตา',
    lastNameTH: 'เจริญสุข',
    firstNameEN: 'Lalita',
    lastNameEN: 'Charoensuk',
    email: 'lalita.c@li.university.ac.th',
    department: 'ภาษาสเปน',
    specializations: ['Spanish Conversation', 'Latin American Studies', 'DELE'],
  },
];

@Injectable({ providedIn: 'root' })
export class InstructorService {
  private readonly _allInstructors = signal<Instructor[]>(MOCK_INSTRUCTORS);
  private readonly _selectedInstructor = signal<Instructor | null>(null);

  readonly allInstructors = this._allInstructors.asReadonly();
  readonly selectedInstructor = this._selectedInstructor.asReadonly();

  selectInstructor(instructor: Instructor | null): void {
    this._selectedInstructor.set(instructor);
  }

  getInstructorById(id: string): Instructor | undefined {
    return this._allInstructors().find(i => i.id === id);
  }
}
