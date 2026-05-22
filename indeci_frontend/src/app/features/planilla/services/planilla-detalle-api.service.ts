import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { PlanillaDetalleRow } from '../models/planilla-detalle.model';

/**
 * Detalle de planilla (conceptos por movimiento) — Spec 009 / T150.
 * Backend: `MovimientoPlanillaDetalleController` → `/api/rrhh/planilla-detalle`.
 */
@Injectable({ providedIn: 'root' })
export class PlanillaDetalleApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/planilla-detalle';

  /** Detalle agrupable por tipo (INGRESO / DESCUENTO) en el cliente. */
  listarDetalle(empleadoId: number, periodo: string): Observable<readonly PlanillaDetalleRow[]> {
    return this.http
      .get<ApiResponse<PlanillaDetalleRow[]>>(`${this.baseUrl}/${empleadoId}/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
