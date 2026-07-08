import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CtsRegularResult, CtsRegularGenerarRequest } from '../models/cts-regular.model';

@Injectable({
  providedIn: 'root'
})
export class CtsRegularApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/cts-regular`;

  generar(payload: CtsRegularGenerarRequest): Observable<CtsRegularResult> {
    return this.http.post<CtsRegularResult>(`${this.baseUrl}/generar`, payload);
  }

  // Descarga del reporte individual
  descargarReporte(empleadoId: number, periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reporte`, {
      params: { empleadoId: empleadoId.toString(), periodo },
      responseType: 'blob'
    });
  }
}
