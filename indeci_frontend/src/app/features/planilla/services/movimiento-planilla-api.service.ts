import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { MovimientoPlanillaRow } from '../models/movimiento-planilla.model';
import type { ResumenMetaRow } from '../models/resumen-meta.model';

/**
 * Movimientos de planilla (Spec 009 / T149).
 * Backend: `MovimientoPlanillaController` → `/api/rrhh/movimiento-planilla`.
 */
@Injectable({ providedIn: 'root' })
export class MovimientoPlanillaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/movimiento-planilla';

  /** Cabecera de planilla de un empleado en un periodo. */
  obtenerEmpleado(empleadoId: number, periodo: string): Observable<MovimientoPlanillaRow> {
    return this.http
      .get<ApiResponse<MovimientoPlanillaRow>>(`${this.baseUrl}/${empleadoId}/${periodo}`)
      .pipe(map(extractApiData));
  }

  /** Cabeceras de planilla para todo el periodo. */
  listarPeriodo(periodo: string): Observable<readonly MovimientoPlanillaRow[]> {
    return this.http
      .get<ApiResponse<MovimientoPlanillaRow[]>>(`${this.baseUrl}/periodo/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Historial de cabeceras de planilla de un empleado (PANTALLA-08). */
  listarPorEmpleado(empleadoId: number): Observable<readonly MovimientoPlanillaRow[]> {
    return this.http
      .get<ApiResponse<MovimientoPlanillaRow[]>>(`${this.baseUrl}/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }

  cambiarEstado(id: number, estado: string): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/${id}/estado/${estado}`, null)
      .pipe(map(extractApiData));
  }

  /** Resumen del periodo agrupado por meta presupuestal (PANTALLA-05). */
  resumenPorMeta(periodo: string): Observable<readonly ResumenMetaRow[]> {
    return this.http
      .get<ApiResponse<ResumenMetaRow[]>>(`${this.baseUrl}/resumen-por-meta/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
