import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  ElegibilidadVinculoRow,
  EmpleadoPlanillaInput,
  EmpleadoPlanillaRow,
  EmpleadoRemuneracionHistRow,
  PlanillaConsolidadaRow,
  RemuneracionCambioInput,
} from '../models/empleado-planilla.model';
import type {
  IncrementosDsQuery,
  IncrementosDsResponse,
} from '../models/incrementos-ds.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoPlanillaApiService {
  private readonly http = inject(HttpClient);

  /** Tabla consolidada: todos los empleados activos con su planilla (o sin configurar). */
  listarConsolidado(): Observable<readonly PlanillaConsolidadaRow[]> {
    return this.http
      .get<ApiResponse<PlanillaConsolidadaRow[]>>('/api/rrhh/planilla')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listar(empleadoId: number): Observable<readonly EmpleadoPlanillaRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoPlanillaRow[]>>(`/api/rrhh/planilla/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Preview UI: incrementos DS sin persistir. */
  calcularIncrementosDs(params: IncrementosDsQuery): Observable<IncrementosDsResponse> {
    let httpParams = new HttpParams()
      .set('regimenLaboralId', params.regimenLaboralId)
      .set('montoContratado', params.montoContratado);
    if (params.condicionLaboralId != null) {
      httpParams = httpParams.set('condicionLaboralId', params.condicionLaboralId);
    }
    return this.http
      .get<ApiResponse<IncrementosDsResponse>>('/api/rrhh/planilla/incrementos-ds', {
        params: httpParams,
      })
      .pipe(map(extractApiData));
  }

  guardar(body: EmpleadoPlanillaInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>('/api/rrhh/planilla', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: EmpleadoPlanillaInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/planilla/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/planilla/${id}`)
      .pipe(map(extractApiData));
  }

  /** F2 — Historial remunerativo del vínculo (por empleadoPlanillaId). */
  listarRemuneracionHist(
    empleadoPlanillaId: number,
  ): Observable<readonly EmpleadoRemuneracionHistRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoRemuneracionHistRow[]>>(
        `/api/rrhh/empleado-planilla/${empleadoPlanillaId}/remuneracion-hist`,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  registrarCambioRemunerativo(
    empleadoPlanillaId: number,
    input: RemuneracionCambioInput,
  ): Observable<EmpleadoRemuneracionHistRow> {
    return this.http
      .post<ApiResponse<EmpleadoRemuneracionHistRow>>(
        `/api/rrhh/empleado-planilla/${empleadoPlanillaId}/remuneracion-hist`,
        input,
      )
      .pipe(map(extractApiData));
  }

  eliminarCambioRemunerativo(empleadoPlanillaId: number, historialId: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(
        `/api/rrhh/empleado-planilla/${empleadoPlanillaId}/remuneracion-hist/${historialId}`,
      )
      .pipe(map(extractApiData));
  }

  /** F4a — elegibilidad calculada del vínculo para planilla / MCPP. */
  obtenerElegibilidad(empleadoPlanillaId: number): Observable<ElegibilidadVinculoRow> {
    return this.http
      .get<ApiResponse<ElegibilidadVinculoRow>>(
        `/api/rrhh/empleado-planilla/${empleadoPlanillaId}/elegibilidad`,
      )
      .pipe(map(extractApiData));
  }
}
