import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Daily } from '../models/daily';

export interface DailyInitData {
  mealTypes: { value: string; label: string }[];
  config: {
    mealsMax: number;
    mealsMin: number;
    menusMin: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DailyService {
  private http = inject(HttpClient);
  private baseUrl = '/api/daily';

  create(data: Partial<Daily> & { _token: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/create`, data);
  }

  update(dailyId: number, data: Partial<Daily> & { _token: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/update/${dailyId}`, data);
  }

  fetchCsrfToken(): Observable<string> {
    const tokenId = 'daily_create';

    return this.http
      .get<{ token: string }>(`${this.baseUrl}/csrf-token/${tokenId}`)
      .pipe(map((csrfToken) => csrfToken.token));
  }

  fetch(baseDate: string, viewMode: string): Observable<Daily[]> {
    return this.http.post<Daily[]>(`${this.baseUrl}`, { baseDate, viewMode });
  }

  fetchById(dailyId: number): Observable<Daily> {
    return this.http.get<Daily>(`${this.baseUrl}/${dailyId}`);
  }

  getInitData(): Observable<DailyInitData> {
    return this.http.get<DailyInitData>(`${this.baseUrl}/init-data`);
  }
}
