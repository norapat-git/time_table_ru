import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import { FacultyItem, ProgramGroupItem, ProgramSubGroupItem, CurriculumCourseRow } from '../models/curriculum.model';

@Injectable({
  providedIn: 'root',
})
export class CurriculumService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/curriculum`;

  getFaculties(): Observable<{ success: boolean; results: FacultyItem[] }> {
    return this.http.get<{ success: boolean; results: FacultyItem[] }>(`${this.baseUrl}/faculties`);
  }

  getGroupsByFaculty(facultyNo: string): Observable<{ success: boolean; results: ProgramGroupItem[] }> {
    return this.http.get<{ success: boolean; results: ProgramGroupItem[] }>(`${this.baseUrl}/groups/${encodeURIComponent(facultyNo)}`);
  }

  getSubGroups(facultyNo: string, groupNo: string): Observable<{ success: boolean; results: ProgramSubGroupItem[] }> {
    return this.http.get<{ success: boolean; results: ProgramSubGroupItem[] }>(
      `${this.baseUrl}/sub-groups/${encodeURIComponent(facultyNo)}/${encodeURIComponent(groupNo)}`
    );
  }

  listCurriculumCourses(filters?: {
    facultyNo?: string;
    groupNo?: string;
    subGroupNo?: string;
    yearLevel?: string;
    semester?: string;
    search?: string;
  }): Observable<{ success: boolean; results: CurriculumCourseRow[] }> {
    let params = new HttpParams();
    if (filters?.facultyNo) params = params.set('facultyNo', filters.facultyNo);
    if (filters?.groupNo) params = params.set('groupNo', filters.groupNo);
    if (filters?.subGroupNo) params = params.set('subGroupNo', filters.subGroupNo);
    if (filters?.yearLevel) params = params.set('yearLevel', filters.yearLevel);
    if (filters?.semester) params = params.set('semester', filters.semester);
    if (filters?.search) params = params.set('search', filters.search.trim());

    return this.http.get<{ success: boolean; results: CurriculumCourseRow[] }>(`${this.baseUrl}/list`, { params });
  }

  addCurriculumCourses(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/add`, payload);
  }

  deleteCurriculumCourse(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete`, payload);
  }

  deleteCurriculumBulk(payload: { items: any[]; userDelete?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete-bulk`, payload);
  }
}
