import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ImportCommit, ImportPreview } from '../models/import-vinculacion.model';

/**
 * Cliente del Import de Vinculación (Registro Integrado de Personal).
 *
 * Dos fases, igual que el backend:
 *  - {@link previsualizar} valida el Excel y devuelve el estado fila por fila SIN escribir.
 *  - {@link importar} persiste solo las filas correctas (idempotente por DNI + N.° contrato).
 */
@Injectable({ providedIn: 'root' })
export class ImportVinculacionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/vinculacion/import';

  /** Sube el .xlsx y devuelve la previsualización. No modifica datos. */
  previsualizar(archivo: File): Observable<ImportPreview> {
    return this.http
      .post<ApiResponse<ImportPreview>>(`${this.baseUrl}/preview`, this.form(archivo))
      .pipe(map(extractApiData));
  }

  /** Importa las filas válidas del .xlsx y devuelve el resumen del commit. */
  importar(archivo: File): Observable<ImportCommit> {
    return this.http
      .post<ApiResponse<ImportCommit>>(`${this.baseUrl}/commit`, this.form(archivo))
      .pipe(map(extractApiData));
  }

  private form(archivo: File): FormData {
    const form = new FormData();
    form.append('archivo', archivo);
    return form;
  }
}
