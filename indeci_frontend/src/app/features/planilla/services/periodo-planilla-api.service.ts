import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  AprobacionPeriodoInput,
  PeriodoPlanillaInput,
  PeriodoPlanillaRow,
} from '../models/periodo-planilla.model';

/**
 * Periodos de planilla (Spec 009 — camino crítico).
 * Backend: `PeriodoPlanillaController` → `/api/rrhh/periodo-planilla`.
 */
@Injectable({ providedIn: 'root' })
export class PeriodoPlanillaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/periodo-planilla';

  listar(): Observable<readonly PeriodoPlanillaRow[]> {
    return this.http
      .get<ApiResponse<PeriodoPlanillaRow[]>>(this.baseUrl)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crear(body: PeriodoPlanillaInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(this.baseUrl, body)
      .pipe(map(extractApiData));
  }

  /** ABIERTO → EN_REVISION (Spec 011 — B7). */
  enviarRevision(id: number): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/enviar-revision/${id}`, null)
      .pipe(map(extractApiData));
  }

  /** EN_REVISION → APROBADO con los 3 gates (Spec 011 — B7). */
  aprobar(id: number, body: AprobacionPeriodoInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/aprobar/${id}`, body)
      .pipe(map(extractApiData));
  }

  cerrar(id: number): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/cerrar/${id}`, null)
      .pipe(map(extractApiData));
  }

  reabrir(id: number): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/reabrir/${id}`, null)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }
}
