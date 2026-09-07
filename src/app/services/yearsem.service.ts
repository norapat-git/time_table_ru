import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import { YearSemItem } from '../models/yearsem.model';

@Injectable({
  providedIn: 'root',
})
export class YearSemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/yearsem`;

  getYearSemList(): Observable<{ success: boolean; results: YearSemItem[] }> {
    return this.http.get<{ success: boolean; results: YearSemItem[] }>(`${this.baseUrl}/list`);
  }

  getActiveYearSem(): Observable<{ success: boolean; results: { STUDY_YEAR: string; STUDY_SEMESTER: string; STUDY_ACTIVE?: string } | null }> {
    return this.http.get<{ success: boolean; results: { STUDY_YEAR: string; STUDY_SEMESTER: string; STUDY_ACTIVE?: string } | null }>(
      `${this.baseUrl}/active`
    );
  }

  addYearSem(payload: { studyYear: string; studySemester: string; studyActive?: string; userInsert?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/add`, payload);
  }

  updateYearSem(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/update`, payload);
  }

  setActiveYearSem(payload: { studyYear: string; studySemester: string; userInsert?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/set-active`, payload);
  }

  deleteYearSem(year: string, semester: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/delete/${year}/${semester}`);
  }
}
