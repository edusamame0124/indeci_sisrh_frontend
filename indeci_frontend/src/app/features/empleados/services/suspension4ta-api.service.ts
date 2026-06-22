import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  Suspension4taInput,
  Suspension4taRow,
} from '../models/suspension4ta.model';
import type {
  Ir4taControlAnual,
  Ir4taReinicioInput,
  TipoTopeIr4ta,
} from '../models/ir4ta-control-anual.model';

/**
 * FASE 1 — API de constancias de suspensión de retención de 4ta categoría (CAS).
 * Endpoints backend: /api/rrhh/suspension-4ta.
 */
@Injectable({ providedIn: 'root' })
export class Suspension4taApiService {
  private readonly http = inject(HttpClient);

  listar(empleadoId: number): Observable<readonly Suspension4taRow[]> {
    return this.http
      .get<ApiResponse<Suspension4taRow[]>>(`/api/rrhh/suspension-4ta/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crear(body: Suspension4taInput): Observable<Suspension4taRow> {
    return this.http
      .post<ApiResponse<Suspension4taRow>>('/api/rrhh/suspension-4ta', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: Suspension4taInput): Observable<Suspension4taRow> {
    return this.http
      .put<ApiResponse<Suspension4taRow>>(`/api/rrhh/suspension-4ta/${id}`, body)
      .pipe(map(extractApiData));
  }

  anular(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/suspension-4ta/${id}`)
      .pipe(map(extractApiData));
  }

  // ── Control anual del tope de suspensión (pendiente B2) ───────────────────

  /** Vista de solo lectura del control anual (acumulado, tope, alertas). */
  controlAnual(empleadoId: number, anio: number): Observable<Ir4taControlAnual> {
    return this.http
      .get<ApiResponse<Ir4taControlAnual>>(
        `/api/rrhh/suspension-4ta/${empleadoId}/control-anual`,
        { params: { anio } },
      )
      .pipe(map(extractApiData));
  }

  /** Flag manual de RR.HH.: tope aplicable al trabajador. */
  definirTipoTope(
    empleadoId: number,
    anio: number,
    tipoTope: TipoTopeIr4ta,
  ): Observable<Ir4taControlAnual> {
    return this.http
      .put<ApiResponse<Ir4taControlAnual>>(
        `/api/rrhh/suspension-4ta/${empleadoId}/control-anual/tipo-tope`,
        null,
        { params: { anio, tipoTope } },
      )
      .pipe(map(extractApiData));
  }

  /** Confirma el reinicio de retención tras superar el tope (RR.HH.). */
  confirmarReinicio(
    empleadoId: number,
    body: Ir4taReinicioInput,
  ): Observable<Ir4taControlAnual> {
    return this.http
      .post<ApiResponse<Ir4taControlAnual>>(
        `/api/rrhh/suspension-4ta/${empleadoId}/control-anual/confirmar-reinicio`,
        body,
      )
      .pipe(map(extractApiData));
  }
}
