import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EstadoEvento,
  EventoPeriodoRequest,
  EventoPeriodoResponse,
  TipoEvento,
} from '../models/evento-periodo.model';

/**
 * F3.6 — Cliente del CRUD de eventos del período.
 * Backend: {@code EventoPeriodoController} → `/api/rrhh/evento-periodo`.
 */
@Injectable({ providedIn: 'root' })
export class EventoPeriodoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/evento-periodo';

  /** Catálogo de tipos de evento (activos, ordenados visualmente). */
  listarTipos(): Observable<readonly TipoEvento[]> {
    return this.http
      .get<ApiResponse<TipoEvento[]>>(`${this.baseUrl}/tipos`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Eventos del empleado, más recientes primero. */
  listarPorEmpleado(empleadoId: number): Observable<readonly EventoPeriodoResponse[]> {
    return this.http
      .get<ApiResponse<EventoPeriodoResponse[]>>(
        `${this.baseUrl}/empleado/${empleadoId}`,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  obtener(id: number): Observable<EventoPeriodoResponse> {
    return this.http
      .get<ApiResponse<EventoPeriodoResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }

  crear(dto: EventoPeriodoRequest): Observable<EventoPeriodoResponse> {
    return this.http
      .post<ApiResponse<EventoPeriodoResponse>>(this.baseUrl, dto)
      .pipe(map(extractApiData));
  }

  actualizar(
    id: number,
    dto: EventoPeriodoRequest,
  ): Observable<EventoPeriodoResponse> {
    return this.http
      .put<ApiResponse<EventoPeriodoResponse>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map(extractApiData));
  }

  cambiarEstado(
    id: number,
    estado: EstadoEvento,
  ): Observable<EventoPeriodoResponse> {
    return this.http
      .put<ApiResponse<EventoPeriodoResponse>>(
        `${this.baseUrl}/${id}/estado/${estado}`,
        null,
      )
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }
}
