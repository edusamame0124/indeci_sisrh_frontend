import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import type { ApiResponse } from '../../../core/models/api-response.model';
import type {
  CtsCalcularRequest,
  CtsCandidato,
  CtsDesglose,
  CtsLiquidacionResponse,
} from '../models/cts.model';

const BASE = '/api/rrhh/liquidaciones/cts';

/**
 * Feature 016 — Consumo de la API de Liquidación de CTS Trunca.
 * Flujo unidireccional: el cliente NUNCA envía montos; solo lee lo calculado.
 */
@Injectable({ providedIn: 'root' })
export class CtsApiService {
  private readonly http = inject(HttpClient);

  listarCandidatos(periodo: string, regimenLaboralId: number): Observable<readonly CtsCandidato[]> {
    const params = new HttpParams()
      .set('periodo', periodo)
      .set('regimenLaboralId', String(regimenLaboralId));
    return this.http
      .get<ApiResponse<readonly CtsCandidato[]>>(`${BASE}/candidatos`, { params })
      .pipe(map((r) => r.data));
  }

  calcular(req: CtsCalcularRequest): Observable<CtsLiquidacionResponse> {
    return this.http
      .post<ApiResponse<CtsLiquidacionResponse>>(`${BASE}/calcular`, req)
      .pipe(map((r) => r.data));
  }

  desglose(id: number): Observable<CtsDesglose> {
    return this.http
      .get<ApiResponse<CtsDesglose>>(`${BASE}/${id}/desglose`)
      .pipe(map((r) => r.data));
  }

  aprobar(id: number): Observable<CtsLiquidacionResponse> {
    return this.http
      .post<ApiResponse<CtsLiquidacionResponse>>(`${BASE}/${id}/aprobar`, {})
      .pipe(map((r) => r.data));
  }
}
