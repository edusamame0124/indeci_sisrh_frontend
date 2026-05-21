import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { EmpleadoFlowStatus } from '../models/empleado-flow-status.model';

/**
 * Spec 012 / C3 (BKD-006) — Estado agregado del flujo de empleado.
 * Una sola llamada reemplaza los 5 GET paralelos (puesto, banco, pensión,
 * planilla, conceptos). Backend: `EmpleadoFlowController`.
 */
@Injectable({ providedIn: 'root' })
export class EmpleadoFlowStatusApiService {
  private readonly http = inject(HttpClient);

  flowStatus(empleadoId: number): Observable<EmpleadoFlowStatus> {
    return this.http
      .get<ApiResponse<EmpleadoFlowStatus>>(`/api/rrhh/empleado/${empleadoId}/flow-status`)
      .pipe(map(extractApiData));
  }
}
