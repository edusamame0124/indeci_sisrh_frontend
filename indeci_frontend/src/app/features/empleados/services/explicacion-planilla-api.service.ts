import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ExplicacionPlanilla } from '../models/explicacion-planilla.model';

/**
 * F3.1 — Cliente del endpoint que alimenta la Ficha 360 del Empleado.
 * Backend: `ExplicacionPlanillaController` → `/api/rrhh/empleado`.
 */
@Injectable({ providedIn: 'root' })
export class ExplicacionPlanillaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/empleado';

  /**
   * Devuelve la explicación completa (cabecera + totales + líneas) del
   * cálculo de planilla del empleado para el período. Si el movimiento no
   * existe, la respuesta tiene `aplica = false` y los demás campos nulos.
   */
  explicar(empleadoId: number, periodo: string): Observable<ExplicacionPlanilla> {
    return this.http
      .get<ApiResponse<ExplicacionPlanilla>>(
        `${this.baseUrl}/${empleadoId}/explicacion/${periodo}`,
      )
      .pipe(map(extractApiData));
  }
}
