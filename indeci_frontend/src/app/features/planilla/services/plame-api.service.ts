import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { PlamePreview } from '../models/plame-export.model';
import type { ExportArchivoRow } from '../models/export-archivo.model';

/**
 * B3 / M09 — Exportación PLAME / PDT 601.
 * Backend: `PlameController` → `/api/rrhh/plame` (endpoints B3-6, en construcción).
 * Las descargas devuelven Blob (text/plain o application/zip).
 */
@Injectable({ providedIn: 'root' })
export class PlameApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/plame';
  private readonly exportUrl = '/api/rrhh/export-archivo';

  /** Descarga el archivo .rem (remuneraciones) del período. */
  descargarRem(periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${periodo}/rem`, { responseType: 'blob' });
  }

  /** Descarga el archivo .jor (jornada laboral) del período. */
  descargarJor(periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${periodo}/jor`, { responseType: 'blob' });
  }

  /** Descarga el archivo .snl (subsidios y no laborados) del período. */
  descargarSnl(periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${periodo}/snl`, { responseType: 'blob' });
  }

  /** Descarga el ZIP con los tres archivos (.rem + .jor + .snl). */
  descargarZip(periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${periodo}/zip`, { responseType: 'blob' });
  }

  /** Resumen previo a la descarga: conteos de líneas + totales del período. */
  preview(periodo: string): Observable<PlamePreview> {
    return this.http
      .get<ApiResponse<PlamePreview>>(`${this.baseUrl}/${periodo}/preview`)
      .pipe(map(extractApiData));
  }

  /** Historial de exportaciones del período (PLAME + MCPP). */
  historial(periodo: string): Observable<readonly ExportArchivoRow[]> {
    return this.http
      .get<ApiResponse<ExportArchivoRow[]>>(`${this.exportUrl}/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
