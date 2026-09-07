import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import { CourseItem } from '../models/course.model';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/course`;

  listCourses(year: string, semester: string, search?: string): Observable<{ success: boolean; results: CourseItem[] }> {
    let params = new HttpParams().set('year', year).set('semester', semester);
    if (search) {
      params = params.set('search', search.trim());
    }
    return this.http.get<{ success: boolean; results: CourseItem[] }>(`${this.baseUrl}/list`, { params });
  }

  getFirstLetters(): Observable<{ success: boolean; results: string[] }> {
    return this.http.get<{ success: boolean; results: string[] }>(`${this.baseUrl}/letters`);
  }

  getPrefixGroups(letter: string): Observable<{ success: boolean; results: any[] }> {
    return this.http.get<{ success: boolean; results: any[] }>(`${this.baseUrl}/prefixes/${encodeURIComponent(letter)}`);
  }

  searchUgbCourses(filters?: {
    year?: string;
    semester?: string;
    prefix?: string;
    search?: string;
    code?: string;
    name?: string;
  }): Observable<{ success: boolean; results: any[] }> {
    let params = new HttpParams();
    if (filters?.year) params = params.set('year', filters.year);
    if (filters?.semester) params = params.set('semester', filters.semester);
    if (filters?.prefix) params = params.set('prefix', filters.prefix);
    if (filters?.search) params = params.set('search', filters.search.trim());
    if (filters?.code) params = params.set('code', filters.code.trim());
    if (filters?.name) params = params.set('name', filters.name.trim());
    return this.http.get<{ success: boolean; results: any[] }>(`${this.baseUrl}/search-ugb`, { params });
  }

  addCourse(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/add`, payload);
  }

  updateCourse(payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/update`, payload);
  }

  deleteCourse(year: string, semester: string, courseNo: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/delete/${year}/${semester}/${courseNo}`);
  }

  deleteCoursesBulk(payload: { items: any[]; userDelete?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete-bulk`, payload);
  }
}
