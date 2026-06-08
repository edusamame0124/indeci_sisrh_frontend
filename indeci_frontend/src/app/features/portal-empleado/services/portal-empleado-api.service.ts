import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { PrestamoRow, VacacionSaldoRow } from '../models/portal-empleado.model';
import type { AsistenciaResponse } from '../../asistencia/models/asistencia.model';

/**
 * Lecturas del Portal del Empleado (SPEC §12.2 PANTALLA-08).
 * Backend: `PrestamoController` y `VacacionSaldoController`.
 */
@Injectable({ providedIn: 'root' })
export class PortalEmpleadoApiService {
  private readonly http = inject(HttpClient);

  /** Préstamos del empleado con su saldo pendiente. */
  prestamos(empleadoId: number): Observable<readonly PrestamoRow[]> {
    return this.http
      .get<ApiResponse<PrestamoRow[]>>(`/api/rrhh/prestamo/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Saldo de vacaciones del empleado por año. */
  vacaciones(empleadoId: number): Observable<readonly VacacionSaldoRow[]> {
    return this.http
      .get<ApiResponse<VacacionSaldoRow[]>>(`/api/rrhh/vacacion-saldo/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  asistenciaPropia(periodo: string): Observable<AsistenciaResponse> {
    return this.http
      .get<ApiResponse<AsistenciaResponse>>(`/api/portal/asistencia/${periodo}`)
      .pipe(map(extractApiData));
  }

  asistenciaPdfUrl(periodo: string): string {
    return `/api/portal/asistencia/${periodo}/pdf`;
  }
}
