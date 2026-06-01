import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  ReporteEvolucionResponse,
  ReporteRegimenResponse,
  ReporteTopConceptosResponse,
} from '../models/reporte-consolidado.model';

/**
 * F3.5 — Cliente del Tablero Consolidado.
 *
 * Backend: {@link com.indeci.rrhh.controller.ReporteConsolidadoController}
 * → {@code GET /api/rrhh/reportes/consolidado/{evolucion|regimen|top-conceptos}}.
 */
@Injectable({ providedIn: 'root' })
export class ReporteConsolidadoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/reportes/consolidado';

  evolucion(periodoBase: string, meses: number): Observable<ReporteEvolucionResponse> {
    const params = new HttpParams()
      .set('periodoBase', periodoBase)
      .set('meses', String(meses));
    return this.http
      .get<ApiResponse<ReporteEvolucionResponse>>(`${this.baseUrl}/evolucion`, { params })
      .pipe(map(extractApiData));
  }

  regimen(periodo: string): Observable<ReporteRegimenResponse> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .get<ApiResponse<ReporteRegimenResponse>>(`${this.baseUrl}/regimen`, { params })
      .pipe(map(extractApiData));
  }

  topConceptos(periodo: string, limite: number): Observable<ReporteTopConceptosResponse> {
    const params = new HttpParams()
      .set('periodo', periodo)
      .set('limite', String(limite));
    return this.http
      .get<ApiResponse<ReporteTopConceptosResponse>>(`${this.baseUrl}/top-conceptos`, { params })
      .pipe(map(extractApiData));
  }
}
