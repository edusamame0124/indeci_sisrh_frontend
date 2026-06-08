import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ExportHistorialRow } from '../models/export-historial.model';

/**
 * B1 — Servicio de export XLSX consolidado de planilla.
 *
 * GET /api/rrhh/planilla/export/xlsx?periodo=   → Blob (archivo descargable)
 * GET /api/rrhh/planilla/export/historial?periodo= → ExportHistorialRow[]
 */
@Injectable({ providedIn: 'root' })
export class ExportPlanillaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/rrhh/planilla/export';

  /** Descarga el XLSX y lo entrega como Blob para que el navegador lo guarde. */
  descargarXlsx(periodo: string): Observable<Blob> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http.get(`${this.base}/xlsx`, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * P0 — Descarga la Planilla CAS Consolidada (XLSX de 19 bloques). Requiere
   * permiso PLA_WRITE en backend (contiene datos bancarios).
   */
  descargarCasConsolidada(periodo: string): Observable<Blob> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http.get(`${this.base}/cas-consolidada`, {
      params,
      responseType: 'blob',
    });
  }

  /** Historial de exports del período (más reciente primero). */
  historial(periodo: string): Observable<readonly ExportHistorialRow[]> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .get<ExportHistorialRow[]>(`${this.base}/historial`, { params })
      .pipe(map(rows => rows ?? []));
  }
}
