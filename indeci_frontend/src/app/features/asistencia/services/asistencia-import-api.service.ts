import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  AsistenciaImportHistorial,
  AsistenciaImportPreview,
  AsistenciaValidacionBatch,
  EstrategiaConflicto,
  SpringPage,
} from '../models/asistencia-import.model';

@Injectable({ providedIn: 'root' })
export class AsistenciaImportApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/asistencia/import';

  preview(periodo: string, archivo: File): Observable<AsistenciaImportPreview> {
    const form = new FormData();
    form.append('periodo', periodo);
    form.append('archivo', archivo);
    return this.http
      .post<ApiResponse<AsistenciaImportPreview>>(`${this.baseUrl}/preview`, form)
      .pipe(map(extractApiData));
  }

  confirmar(
    importacionId: number,
    estrategiaConflicto: EstrategiaConflicto,
  ): Observable<AsistenciaImportPreview> {
    return this.http
      .post<ApiResponse<AsistenciaImportPreview>>(`${this.baseUrl}/${importacionId}/confirm`, {
        importacionId,
        estrategiaConflicto,
      })
      .pipe(map(extractApiData));
  }

  historial(periodo: string | null, page = 0, size = 20): Observable<SpringPage<AsistenciaImportHistorial>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (periodo != null && periodo.trim().length > 0) {
      params = params.set('periodo', periodo);
    }
    return this.http
      .get<ApiResponse<SpringPage<AsistenciaImportHistorial>>>(this.baseUrl, { params })
      .pipe(map(extractApiData));
  }

  validarCabeceras(importacionId: number): Observable<AsistenciaValidacionBatch> {
    return this.http
      .post<ApiResponse<AsistenciaValidacionBatch>>(
        `${this.baseUrl}/${importacionId}/validar-cabeceras`,
        {},
      )
      .pipe(map(extractApiData));
  }
}
