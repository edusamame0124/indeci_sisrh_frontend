import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { PrestamoInput, PrestamoRow } from '../models/beneficio.model';

/**
 * Préstamos del empleado (Spec 011 / B5).
 * Backend: `PrestamoController` → `/api/rrhh/prestamo`.
 */
@Injectable({ providedIn: 'root' })
export class PrestamoApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/prestamo';

  listarPorEmpleado(empleadoId: number): Observable<readonly PrestamoRow[]> {
    return this.http
      .get<ApiResponse<PrestamoRow[]>>(`${this.baseUrl}/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  registrar(body: PrestamoInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(this.baseUrl, body)
      .pipe(map(extractApiData));
  }

  /** Suma una cuota pagada; al completar todas, el préstamo pasa a CANCELADO. */
  registrarPago(id: number): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/${id}/pago`, null)
      .pipe(map(extractApiData));
  }
}
