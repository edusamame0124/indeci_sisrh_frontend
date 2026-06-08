import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { AsistenciaGuardarInput, AsistenciaResponse } from '../models/asistencia.model';

/**
 * Asistencia M04 (SPEC §12.2 PANTALLA-02).
 * Backend: `AsistenciaController` → `/api/rrhh/asistencia`.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/asistencia';

  /** Asistencia del empleado/periodo (calendario nuevo si aún no existe). */
  obtener(empleadoId: number, periodo: string): Observable<AsistenciaResponse> {
    return this.http
      .get<ApiResponse<AsistenciaResponse>>(`${this.baseUrl}/${empleadoId}/${periodo}`)
      .pipe(map(extractApiData));
  }

  /** Guarda (UPSERT) la asistencia del periodo. */
  guardar(body: AsistenciaGuardarInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(this.baseUrl, body)
      .pipe(map(extractApiData));
  }

  pdfUrl(empleadoId: number, periodo: string): string {
    return `${this.baseUrl}/${empleadoId}/${periodo}/pdf`;
  }
}
