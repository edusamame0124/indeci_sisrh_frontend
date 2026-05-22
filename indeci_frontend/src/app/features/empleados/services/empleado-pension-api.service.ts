import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EmpleadoPensionInput,
  EmpleadoPensionRow,
  TasasVigentesPension,
} from '../models/empleado-pension.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoPensionApiService {
  private readonly http = inject(HttpClient);

  listar(empleadoId: number): Observable<readonly EmpleadoPensionRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoPensionRow[]>>(`/api/rrhh/pension/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  guardar(body: EmpleadoPensionInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>('/api/rrhh/pension', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: EmpleadoPensionInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/pension/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/pension/${id}`)
      .pipe(map(extractApiData));
  }

  /**
   * Spec 013 / C1 — Autocomplete del modal "Registrar pensión". Devuelve
   * aporte/comisión/prima vigentes para el régimen (y tipo, si AFP).
   * Solo lectura — no graba nada.
   */
  obtenerTasasVigentes(
    regimenPensionarioId: number,
    tipoComisionAfpId: number | null,
    anio?: number,
  ): Observable<TasasVigentesPension> {
    const params: Record<string, string | number> = { regimenPensionarioId };
    if (tipoComisionAfpId != null) params['tipoComisionAfpId'] = tipoComisionAfpId;
    if (anio != null) params['anio'] = anio;
    return this.http
      .get<ApiResponse<TasasVigentesPension>>('/api/rrhh/pension/tasas-vigentes', {
        params,
      })
      .pipe(map(extractApiData));
  }
}
