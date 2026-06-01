import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { PreflightValidacionResponse } from '../models/validacion-hallazgo.model';

/**
 * F3.3 — Cliente del Centro de Validaciones.
 *
 * Backend: {@link com.indeci.rrhh.controller.ValidacionPreflightController}
 * → `GET /api/rrhh/validaciones/preflight?periodo=YYYY-MM`.
 */
@Injectable({ providedIn: 'root' })
export class ValidacionPreflightApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/validaciones';

  preflight(periodo: string): Observable<PreflightValidacionResponse> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .get<ApiResponse<PreflightValidacionResponse>>(`${this.baseUrl}/preflight`, { params })
      .pipe(map(extractApiData));
  }
}
