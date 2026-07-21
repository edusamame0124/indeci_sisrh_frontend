import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { AsistenciaGuardarInput, AsistenciaResponse } from '../models/asistencia.model';
import type {
  AsistenciaDiariaEditInput,
  AsistenciaDiariaFiltro,
  AsistenciaDiariaPage,
  AsistenciaDiariaRow,
} from '../models/asistencia-diaria.model';

/**
 * Asistencia M04 (SPEC §12.2 PANTALLA-02).
 * Backend: `AsistenciaController` → `/api/rrhh/asistencia`.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/asistencia';

  /** Asistencia del empleado/periodo (calendario nuevo si aún no existe). */
  obtener(empleadoId: number, periodo: string): Observable<AsistenciaResponse> {
    return this.http
      .get<ApiResponse<AsistenciaResponse>>(`${this.baseUrl}/${empleadoId}/${periodo}`)
      .pipe(map(extractApiData));
  }

  /** Guarda (UPSERT) la asistencia del periodo. */
  guardar(body: AsistenciaGuardarInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(this.baseUrl, body)
      .pipe(map(extractApiData));
  }

  /** Recalcula tardanza (desde marcas + jornada vigente) y descuentos; devuelve la asistencia. */
  recalcular(empleadoId: number, periodo: string): Observable<AsistenciaResponse> {
    return this.http
      .post<ApiResponse<AsistenciaResponse>>(`${this.baseUrl}/${empleadoId}/${periodo}/recalcular`, {})
      .pipe(map(extractApiData));
  }

  /** Descarga el PDF de asistencia como blob (lleva el JWT vía interceptor). */
  descargarPdf(empleadoId: number, periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${empleadoId}/${periodo}/pdf`, {
      responseType: 'blob',
    });
  }

  /** Consulta de asistencia por rango [fechaInicio, fechaFin] y filtros opcionales. */
  listarDiaria(params: AsistenciaDiariaFiltro): Observable<AsistenciaDiariaPage> {
    const httpParams: Record<string, string> = {
      fechaInicio: params.fechaInicio,
      page: String(params.page ?? 0),
      size: String(params.size ?? 10),
    };
    if (params.fechaFin?.trim()) {
      httpParams['fechaFin'] = params.fechaFin.trim();
    }
    if (params.dni?.trim()) {
      httpParams['dni'] = params.dni.trim();
    }
    if (params.q?.trim()) {
      httpParams['q'] = params.q.trim();
    }
    return this.http
      .get<ApiResponse<AsistenciaDiariaPage>>(`${this.baseUrl}/diaria`, { params: httpParams })
      .pipe(map(extractApiData));
  }

  /**
   * Detalle diario de una importación (lote) — módulo de detalle del historial.
   * Mismo formato que la consulta diaria, pero abarca todo el período del lote (solo lectura).
   */
  listarPorImportacion(
    importacionId: number,
    params: { dni?: string; q?: string; tipoDia?: string; page?: number; size?: number } = {},
  ): Observable<AsistenciaDiariaPage> {
    const httpParams: Record<string, string> = {
      page: String(params.page ?? 0),
      size: String(params.size ?? 25),
    };
    if (params.dni?.trim()) {
      httpParams['dni'] = params.dni.trim();
    }
    if (params.q?.trim()) {
      httpParams['q'] = params.q.trim();
    }
    if (params.tipoDia?.trim()) {
      httpParams['tipoDia'] = params.tipoDia.trim();
    }
    return this.http
      .get<ApiResponse<AsistenciaDiariaPage>>(
        `${this.baseUrl}/importacion/${importacionId}/diaria`,
        { params: httpParams },
      )
      .pipe(map(extractApiData));
  }

  /** Edición puntual de un día desde consulta diaria. */
  editarDia(detalleId: number, body: AsistenciaDiariaEditInput): Observable<AsistenciaDiariaRow> {
    return this.http
      .patch<ApiResponse<AsistenciaDiariaRow>>(`${this.baseUrl}/diaria/${detalleId}`, body)
      .pipe(map(extractApiData));
  }
}
