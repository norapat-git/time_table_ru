import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import { Mr30FacultyOption, Mr30ReportResponse } from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/report`;

  getMr30Faculties(): Observable<{ success: boolean; results: Mr30FacultyOption[] }> {
    return this.http.get<{ success: boolean; results: Mr30FacultyOption[] }>(`${this.baseUrl}/mr30/faculties`);
  }

  getMr30Report(
    year: string,
    semester: string,
    filters?: {
      facultyNo?: string;
      dayNo?: string;
      search?: string;
    }
  ): Observable<Mr30ReportResponse> {
    let params = new HttpParams().set('year', year).set('semester', semester);
    if (filters?.facultyNo) params = params.set('facultyNo', filters.facultyNo);
    if (filters?.dayNo) params = params.set('dayNo', filters.dayNo);
    if (filters?.search) params = params.set('search', filters.search.trim());

    return this.http.get<Mr30ReportResponse>(`${this.baseUrl}/mr30`, { params });
  }
}
