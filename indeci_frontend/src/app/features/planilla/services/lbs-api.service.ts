import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { LbsResult, LbsGenerarRequest } from '../models/lbs.model';

@Injectable({
  providedIn: 'root'
})
export class LbsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/lbs`;

  generar(payload: LbsGenerarRequest): Observable<LbsResult> {
    return this.http.post<LbsResult>(`${this.baseUrl}/generar`, payload);
  }

  // Descarga del reporte individual
  descargarReporte(empleadoId: number, periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reporte`, {
      params: { empleadoId: empleadoId.toString(), periodo },
      responseType: 'blob'
    });
  }
}
