import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EmpleadoTurno24hInput,
  EmpleadoTurno24hRow,
} from '../models/empleado-turno-24h.model';

const BASE_URL = '/api/rrhh/empleado-turno-24h';

/**
 * Turno continuo 24h (guardia COEN) — pestaña propia de Gestión de Asistencia.
 * Backend: `EmpleadoTurno24hController` → `/api/rrhh/empleado-turno-24h`.
 */
@Injectable({ providedIn: 'root' })
export class EmpleadoTurno24hApiService {
  private readonly http = inject(HttpClient);

  listarTodosVigentes(): Observable<readonly EmpleadoTurno24hRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoTurno24hRow[]>>(BASE_URL)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarPorEmpleado(empleadoId: number): Observable<readonly EmpleadoTurno24hRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoTurno24hRow[]>>(`${BASE_URL}/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  registrar(input: EmpleadoTurno24hInput): Observable<null> {
    return this.http.post<ApiResponse<null>>(BASE_URL, input).pipe(map(extractApiData));
  }

  actualizar(id: number, input: EmpleadoTurno24hInput): Observable<null> {
    return this.http.put<ApiResponse<null>>(`${BASE_URL}/${id}`, input).pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http.delete<ApiResponse<null>>(`${BASE_URL}/${id}`).pipe(map(extractApiData));
  }
}
