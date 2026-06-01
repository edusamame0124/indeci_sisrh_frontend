import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  RecalculoCriterioRequest,
  RecalculoPreviewResponse,
  RecalculoResultadoResponse,
} from '../models/recalculo.model';

/**
 * F3.4 — Cliente del Asistente de Recálculo.
 *
 * Backend: {@link com.indeci.rrhh.controller.RecalculoAsistenteController}
 * → {@code POST /api/rrhh/recalculo/preview} y {@code .../ejecutar}.
 */
@Injectable({ providedIn: 'root' })
export class RecalculoAsistenteApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/recalculo';

  preview(
    periodo: string,
    criterio: RecalculoCriterioRequest,
  ): Observable<RecalculoPreviewResponse> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .post<ApiResponse<RecalculoPreviewResponse>>(
        `${this.baseUrl}/preview`,
        criterio,
        { params },
      )
      .pipe(map(extractApiData));
  }

  ejecutar(
    periodo: string,
    criterio: RecalculoCriterioRequest,
  ): Observable<RecalculoResultadoResponse> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .post<ApiResponse<RecalculoResultadoResponse>>(
        `${this.baseUrl}/ejecutar`,
        criterio,
        { params },
      )
      .pipe(map(extractApiData));
  }
}
