import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PadronVacacionalPageDto } from '../models/padron-vacacional.model';

@Injectable({
  providedIn: 'root'
})
export class PadronVacacionalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rrhh/vacaciones/padron`;

  consultar(q: string = '', page: number = 0, size: number = 25): Observable<ApiResponse<PadronVacacionalPageDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }

    return this.http.get<ApiResponse<PadronVacacionalPageDto>>(this.baseUrl, { params });
  }

  registrarGoceDirecto(payload: import('../models/padron-vacacional.model').GoceDirectoPayload): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/goce-directo`, payload);
  }

  importarBaseline(file: File): Observable<ApiResponse<import('../../../core/models/api-response.model').ApiResponse<any>>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/rrhh/vacaciones/importar-baseline`, formData);
  }
}
