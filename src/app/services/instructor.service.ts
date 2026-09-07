import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import { ScheduleInstructorItem, MasterInstructorOption } from '../models/instructor.model';

@Injectable({
  providedIn: 'root',
})
export class InstructorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/instructor`;

  listInstructors(year: string, semester: string, facultyNo?: string): Observable<{ success: boolean; results: ScheduleInstructorItem[] }> {
    let params = new HttpParams().set('year', year).set('semester', semester);
    if (facultyNo) {
      params = params.set('facultyNo', facultyNo);
    }
    return this.http.get<{ success: boolean; results: ScheduleInstructorItem[] }>(`${this.baseUrl}/list`, { params });
  }

  getMasterInstructors(search?: string): Observable<{ success: boolean; results: MasterInstructorOption[] }> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search.trim());
    }
    return this.http.get<{ success: boolean; results: MasterInstructorOption[] }>(`${this.baseUrl}/master-list`, { params });
  }

  addScheduleInstructors(payload: any): Observable<{ success: boolean; message: string; insertedCount?: number }> {
    return this.http.post<{ success: boolean; message: string; insertedCount?: number }>(`${this.baseUrl}/add`, payload);
  }

  deleteScheduleInstructor(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete`, payload);
  }

  deleteBulkScheduleInstructors(payload: { items?: any[]; instructorCodes?: string[]; studyYear?: string; studySemester?: string; userInsert?: string; userDelete?: string }): Observable<{ success: boolean; message: string; deletedCount?: number }> {
    return this.http.post<{ success: boolean; message: string; deletedCount?: number }>(`${this.baseUrl}/delete-bulk`, payload);
  }
}
