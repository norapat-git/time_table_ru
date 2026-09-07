import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import {
  TimetableInstructorMeta,
  TimetableClassItem,
  TimetableDayOption,
  TimetableTimeOption,
  TimetableRoomOption,
  TimetablePrefixOption,
  TimetableCourseOption,
  TimetableSlotAvailability,
  TimetableSlotMoveRecord,
} from '../models/timetable.model';

@Injectable({
  providedIn: 'root',
})
export class TimetableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/timetable`;

  getDayOptions(): Observable<{ success: boolean; results: TimetableDayOption[] }> {
    return this.http.get<{ success: boolean; results: TimetableDayOption[] }>(`${this.baseUrl}/days`);
  }

  getTimeSlots(flag?: string): Observable<{ success: boolean; results: TimetableTimeOption[] }> {
    let params = new HttpParams();
    if (flag) {
      params = params.set('flag', flag);
    }
    return this.http.get<{ success: boolean; results: TimetableTimeOption[] }>(`${this.baseUrl}/times`, { params });
  }

  getRoomOptions(): Observable<{ success: boolean; results: TimetableRoomOption[] }> {
    return this.http.get<{ success: boolean; results: TimetableRoomOption[] }>(`${this.baseUrl}/rooms`);
  }

  getScheduledRooms(
    year: string,
    semester: string
  ): Observable<{ success: boolean; results: TimetableRoomOption[]; recentRooms?: TimetableRoomOption[] }> {
    const params = new HttpParams().set('year', year).set('semester', semester);
    return this.http.get<{ success: boolean; results: TimetableRoomOption[]; recentRooms?: TimetableRoomOption[] }>(
      `${this.baseUrl}/scheduled-rooms`,
      { params }
    );
  }

  getScheduleClasses(
    year: string,
    semester: string,
    filters?: { roomCode?: string; dayCode?: number }
  ): Observable<{ success: boolean; results: TimetableClassItem[] }> {
    let params = new HttpParams().set('year', year).set('semester', semester);
    if (filters?.roomCode) {
      params = params.set('roomCode', filters.roomCode);
    }
    if (filters?.dayCode !== undefined && filters?.dayCode !== null) {
      params = params.set('dayCode', String(filters.dayCode));
    }
    return this.http.get<{ success: boolean; results: TimetableClassItem[] }>(`${this.baseUrl}/list`, { params });
  }

  getAllInstructors(year: string, semester: string): Observable<{ success: boolean; results: TimetableInstructorMeta[] }> {
    const params = new HttpParams().set('year', year).set('semester', semester);
    return this.http.get<{ success: boolean; results: TimetableInstructorMeta[] }>(`${this.baseUrl}/instructors`, {
      params,
    });
  }

  getFirstLetters(year?: string, semester?: string): Observable<{ success: boolean; results: string[] }> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (semester) params = params.set('semester', semester);
    return this.http.get<{ success: boolean; results: string[] }>(`${this.baseUrl}/letters`, { params });
  }

  getPrefixGroups(letter: string, year?: string, semester?: string): Observable<{ success: boolean; results: TimetablePrefixOption[] }> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (semester) params = params.set('semester', semester);
    return this.http.get<{ success: boolean; results: TimetablePrefixOption[] }>(
      `${this.baseUrl}/prefixes/${encodeURIComponent(letter)}`,
      { params }
    );
  }

  searchUgbCourses(
    year: string,
    semester: string,
    filter: { prefix?: string; search?: string }
  ): Observable<{ success: boolean; results: TimetableCourseOption[] }> {
    let params = new HttpParams().set('year', year).set('semester', semester);
    if (filter.prefix) {
      params = params.set('prefix', filter.prefix);
    }
    if (filter.search) {
      params = params.set('search', filter.search.trim());
    }
    return this.http.get<{ success: boolean; results: TimetableCourseOption[] }>(`${this.baseUrl}/search-ugb`, {
      params,
    });
  }

  getInstructorAvailability(
    year: string,
    semester: string,
    instructorCodes: string[],
    courseNo?: string
  ): Observable<{
    success: boolean;
    totalInstructors: number;
    hasRu30Schedule?: boolean;
    slots: TimetableSlotAvailability[];
    commonFreeSlots: TimetableSlotAvailability[];
  }> {
    let params = new HttpParams()
      .set('year', year)
      .set('semester', semester)
      .set('instructorCodes', instructorCodes.join(','));
    if (courseNo) {
      params = params.set('courseNo', courseNo.trim());
    }
    return this.http.get<{
      success: boolean;
      totalInstructors: number;
      hasRu30Schedule?: boolean;
      slots: TimetableSlotAvailability[];
      commonFreeSlots: TimetableSlotAvailability[];
    }>(`${this.baseUrl}/instructor-availability`, { params });
  }

  getSlotAvailableInstructors(
    year: string,
    semester: string,
    dayCode: number,
    timeCodes: number[],
    courseNo?: string
  ): Observable<{
    success: boolean;
    availableCodes: string[];
    busyCodes: string[];
    instructorsStatus: Record<string, { isAvailable: boolean; status: string; reason: string }>;
  }> {
    let params = new HttpParams()
      .set('year', year)
      .set('semester', semester)
      .set('dayCode', String(dayCode))
      .set('timeCodes', timeCodes.join(','));
    if (courseNo) {
      params = params.set('courseNo', courseNo.trim());
    }
    return this.http.get<{
      success: boolean;
      availableCodes: string[];
      busyCodes: string[];
      instructorsStatus: Record<string, { isAvailable: boolean; status: string; reason: string }>;
    }>(`${this.baseUrl}/slot-available-instructors`, { params });
  }

  checkInstructorConflicts(
    year: string,
    semester: string,
    dayCode: number,
    timeCode: number,
    instructorCodes: string[],
    excludeCourseNo?: string
  ): Observable<{ success: boolean; hasConflict: boolean; conflicts: any[] }> {
    let params = new HttpParams()
      .set('year', year)
      .set('semester', semester)
      .set('dayCode', String(dayCode))
      .set('timeCode', String(timeCode))
      .set('instructorCodes', instructorCodes.join(','));
    if (excludeCourseNo) {
      params = params.set('excludeCourseNo', excludeCourseNo.trim());
    }
    return this.http.get<{ success: boolean; hasConflict: boolean; conflicts: any[] }>(
      `${this.baseUrl}/check-instructor-conflicts`,
      { params }
    );
  }

  recommendSlots(
    year: string,
    semester: string,
    instructorCodes: string[],
    preferredRoom?: string
  ): Observable<{ success: boolean; recommendations: any[] }> {
    let params = new HttpParams()
      .set('year', year)
      .set('semester', semester)
      .set('instructorCodes', instructorCodes.join(','));
    if (preferredRoom) {
      params = params.set('preferredRoom', preferredRoom.trim());
    }
    return this.http.get<{ success: boolean; recommendations: any[] }>(`${this.baseUrl}/recommend-slots`, {
      params,
    });
  }

  updateScheduleSlots(payload: {
    studyYear: string;
    studySemester: string;
    moves: TimetableSlotMoveRecord[];
    userUpdate?: string;
  }): Observable<{ success: boolean; message: string; updatedCount?: number }> {
    return this.http.post<{ success: boolean; message: string; updatedCount?: number }>(
      `${this.baseUrl}/update-slots`,
      payload
    );
  }

  addScheduleClass(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/add`, payload);
  }

  updateScheduleClass(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/update`, payload);
  }

  deleteScheduleClass(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete`, payload);
  }

  deleteBulkScheduleClasses(payload: { items: any[]; userDelete?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete-bulk`, payload);
  }

  cloneSemester(payload: {
    targetYear: string;
    targetSemester: string;
    sourceYear: string;
    sourceSemester: string;
    mode: 'merge' | 'replace';
    userInsert?: string;
  }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/clone-semester`, payload);
  }
}
