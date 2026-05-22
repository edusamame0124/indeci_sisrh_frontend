import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  TransparenciaPeriodo,
  TransparenciaRemuneracion,
} from '../models/transparencia.model';

/**
 * Portal de Transparencia (Spec 011 / B4 — M10, Ley 27806).
 * Backend público: `TransparenciaController` → `/api/transparencia` (sin auth).
 */
@Injectable({ providedIn: 'root' })
export class TransparenciaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/transparencia';

  /** Períodos publicados (APROBADO / CERRADO). */
  periodos(): Observable<readonly TransparenciaPeriodo[]> {
    return this.http
      .get<ApiResponse<TransparenciaPeriodo[]>>(`${this.baseUrl}/periodos`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Remuneraciones públicas de un período. */
  remuneraciones(periodo: string): Observable<readonly TransparenciaRemuneracion[]> {
    return this.http
      .get<ApiResponse<TransparenciaRemuneracion[]>>(`${this.baseUrl}/remuneraciones/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
