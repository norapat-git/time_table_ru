import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/env';
import { PairedCourseDbRow } from '../models/pair-course.model';

@Injectable({
  providedIn: 'root',
})
export class PairCourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pair-course`;

  listPairCourses(search?: string): Observable<{ success: boolean; results: PairedCourseDbRow[] }> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search.trim());
    }
    return this.http.get<{ success: boolean; results: PairedCourseDbRow[] }>(`${this.baseUrl}/list`, { params });
  }

  addPairGroup(payload: any): Observable<{ success: boolean; message: string; groupId?: number }> {
    return this.http.post<{ success: boolean; message: string; groupId?: number }>(`${this.baseUrl}/add`, payload);
  }

  updatePairGroup(groupId: number | string, payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.baseUrl}/update/${groupId}`, payload);
  }

  deletePairGroup(groupId: number | string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/delete/${groupId}`);
  }

  deletePairGroupsBulk(payload: { groupIds: number[]; userDelete?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/delete-bulk`, payload);
  }
}
