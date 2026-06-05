import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EmpleadoPlanillaInput,
  EmpleadoPlanillaRow,
  PlanillaConsolidadaRow,
} from '../models/empleado-planilla.model';

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
}
