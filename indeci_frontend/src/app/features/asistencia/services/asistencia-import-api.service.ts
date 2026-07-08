import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  AsistenciaImportDetalleFiltro,
  AsistenciaImportFilaDetalle,
  AsistenciaImportHistorial,
  AsistenciaImportPreview,
  AsistenciaImportResumen,
  AsistenciaValidacionBatch,
  EstrategiaConflicto,
  MarcadorAlias,
  MarcadorAliasRequest,
  MarcadorSinMapeo,
  SpringPage,
} from '../models/asistencia-import.model';

@Injectable({ providedIn: 'root' })
export class AsistenciaImportApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/asistencia/import';

  preview(periodo: string, archivo: File): Observable<AsistenciaImportPreview> {
    const form = new FormData();
    form.append('periodo', periodo);
    form.append('archivo', archivo);
    return this.http
      .post<ApiResponse<AsistenciaImportPreview>>(`${this.baseUrl}/preview`, form)
      .pipe(map(extractApiData));
  }

  confirmar(
    importacionId: number,
    estrategiaConflicto: EstrategiaConflicto,
    motivoRectificacion?: string,
  ): Observable<AsistenciaImportPreview> {
    return this.http
      .post<ApiResponse<AsistenciaImportPreview>>(`${this.baseUrl}/${importacionId}/confirm`, {
        importacionId,
        estrategiaConflicto,
        motivoRectificacion: motivoRectificacion ?? null,
      })
      .pipe(map(extractApiData));
  }

  /** F5 / P3 — acepta filas OBSERVADAS (ids vacío = todas) con motivo obligatorio. */
  aceptarObservadas(
    importacionId: number,
    idsFilas: readonly number[],
    motivo: string,
  ): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/${importacionId}/aceptar-observadas`, {
        idsFilas,
        motivo,
      })
      .pipe(map(extractApiData));
  }

  /** F5 / P4 — anula la importación (motivo obligatorio). */
  anular(importacionId: number, motivo: string): Observable<AsistenciaImportPreview> {
    return this.http
      .post<ApiResponse<AsistenciaImportPreview>>(`${this.baseUrl}/${importacionId}/anular`, {
        motivo,
      })
      .pipe(map(extractApiData));
  }

  historial(periodo: string | null, page = 0, size = 20): Observable<SpringPage<AsistenciaImportHistorial>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (periodo != null && periodo.trim().length > 0) {
      params = params.set('periodo', periodo);
    }
    return this.http
      .get<ApiResponse<SpringPage<AsistenciaImportHistorial>>>(this.baseUrl, { params })
      .pipe(map(extractApiData));
  }

  /** F2/F3 — detalle paginado server-side con filtros (25 por defecto). */
  detalles(
    importacionId: number,
    filtro: AsistenciaImportDetalleFiltro = {},
    page = 0,
    size = 25,
  ): Observable<SpringPage<AsistenciaImportFilaDetalle>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtro.dni != null && filtro.dni.trim().length > 0) {
      params = params.set('dni', filtro.dni.trim());
    }
    if (filtro.nombre != null && filtro.nombre.trim().length > 0) {
      params = params.set('nombre', filtro.nombre.trim());
    }
    if (filtro.estado != null && filtro.estado.trim().length > 0) {
      params = params.set('estado', filtro.estado.trim());
    }
    if (filtro.soloErrores) {
      params = params.set('soloErrores', true);
    }
    return this.http
      .get<ApiResponse<SpringPage<AsistenciaImportFilaDetalle>>>(
        `${this.baseUrl}/${importacionId}/detalles`,
        { params },
      )
      .pipe(map(extractApiData));
  }

  resumen(importacionId: number): Observable<AsistenciaImportResumen> {
    return this.http
      .get<ApiResponse<AsistenciaImportResumen>>(`${this.baseUrl}/${importacionId}/resumen`)
      .pipe(map(extractApiData));
  }

  /** F4 — descarga el Excel de filas con error/observadas (req 15). */
  descargarErroresXlsx(importacionId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${importacionId}/errores.xlsx`, {
      responseType: 'blob',
    });
  }

  validarCabeceras(importacionId: number): Observable<AsistenciaValidacionBatch> {
    return this.http
      .post<ApiResponse<AsistenciaValidacionBatch>>(
        `${this.baseUrl}/${importacionId}/validar-cabeceras`,
        {},
      )
      .pipe(map(extractApiData));
  }

  /** F2 (COEN) — nombres del marcador sin mapear a un empleado. */
  sinMapeo(importacionId: number): Observable<readonly MarcadorSinMapeo[]> {
    return this.http
      .get<ApiResponse<readonly MarcadorSinMapeo[]>>(`${this.baseUrl}/${importacionId}/sin-mapeo`)
      .pipe(map(extractApiData));
  }

  /** F2 (COEN) — mapea un nombre del marcador a un empleado (crea/actualiza alias). */
  mapearAlias(request: MarcadorAliasRequest): Observable<MarcadorAlias> {
    return this.http
      .post<ApiResponse<MarcadorAlias>>(`${this.baseUrl}/marcador-alias`, request)
      .pipe(map(extractApiData));
  }
}
