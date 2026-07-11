import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { VacacionSaldoInput, VacacionSaldoRow } from '../models/beneficio.model';

/**
 * Saldo de vacaciones del empleado (Spec 011 / B5).
 * Backend: `VacacionSaldoController` → `/api/rrhh/vacacion-saldo`.
 */
@Injectable({ providedIn: 'root' })
export class VacacionSaldoApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/vacacion-saldo';

  listarPorEmpleado(empleadoId: number): Observable<readonly VacacionSaldoRow[]> {
    return this.http
      .get<ApiResponse<VacacionSaldoRow[]>>(`${this.baseUrl}/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Registra o actualiza (UPSERT por año) el saldo de vacaciones. */
  guardar(body: VacacionSaldoInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(this.baseUrl, body)
      .pipe(map(extractApiData));
  }

  /** Llama al motor de provisión automática para calcular el saldo del empleado. */
  provisionar(empleadoId: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/provisionar/${empleadoId}`, {})
      .pipe(map(extractApiData));
  }
}
