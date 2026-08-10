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
    if (params.soloHorarioEspecial) {
      httpParams['soloHorarioEspecial'] = 'true';
    }
    return this.http
      .get<ApiResponse<AsistenciaDiariaPage>>(`${this.baseUrl}/diaria`, { params: httpParams })
      .pipe(map(extractApiData));
  }

  /** Reporte de asistencia consolidado por período (XLSX, blob — lleva el JWT vía interceptor). */
  descargarResumenPeriodoXlsx(fechaInicio: string, fechaFin: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/diaria/xlsx`, {
      params: { fechaInicio, fechaFin },
      responseType: 'blob',
    });
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

  /**
   * Backfill ÚNICO (temporal, SUPER_ADMIN) — reconcilia todas las papeletas de Vacaciones y
   * Licencia ya APROBADAS contra las cabeceras de asistencia activas actuales. Idempotente.
   * Devuelve la cantidad de papeletas procesadas.
   */
  backfillReconciliacionVacaciones(): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/backfill-reconciliacion-vacaciones`, {})
      .pipe(map(extractApiData));
  }

  /**
   * Backfill ÚNICO (temporal, SUPER_ADMIN, independiente del anterior) — corrige días ya
   * persistidos mal clasificados como LABORAL/OBSERVADO que en realidad son FERIADO según el
   * catálogo oficial. Idempotente. Devuelve la cantidad de días corregidos.
   */
  backfillFeriados(): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/backfill-feriados`, {})
      .pipe(map(extractApiData));
  }

  /**
   * Backfill ÚNICO (temporal, SUPER_ADMIN, independiente de los anteriores) — corrige
   * cabeceras activas con días huérfanos por re-importaciones anteriores al fix de fusión
   * de días (guardarImportacion). Idempotente. Devuelve la cantidad de cabeceras corregidas.
   */
  backfillDiasHuerfanos(): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/backfill-dias-huerfanos`, {})
      .pipe(map(extractApiData));
  }

  /**
   * Backfill ÚNICO (temporal, SUPER_ADMIN, independiente de los anteriores) — corrige días ya
   * persistidos mal clasificados como LABORAL ("Presente") porque el parser del marcador nunca
   * llenaba el dato de salida anticipada (bug corregido 2026-08-07). Solo toca días que siguen
   * exactamente en LABORAL. No es una función permanente: quitar una vez ejecutado en cada
   * ambiente.
   */
  backfillSalidaAnticipada(): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/backfill-salida-anticipada`, {})
      .pipe(map(extractApiData));
  }

  /**
   * Backfill ÚNICO (temporal, SUPER_ADMIN, independiente de los anteriores) — corrige días ya
   * persistidos como FALTA de guardias COEN 24h para empleados con turno 24h activo, usando el
   * mismo reconciliador que corre en cada import nuevo. Idempotente. Devuelve la cantidad de
   * días corregidos.
   */
  backfillTurno24h(): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/backfill-turno-24h`, {})
      .pipe(map(extractApiData));
  }
}
