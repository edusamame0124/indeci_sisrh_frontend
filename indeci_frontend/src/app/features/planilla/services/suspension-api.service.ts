import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  CatSuspensionRow,
  SuspensionInput,
  SuspensionRow,
} from '../models/suspension.model';

/**
 * B3 / M09 — Suspensiones/licencias (fuente del .snl/.jor).
 * Backend: `SuspensionController` → `/api/rrhh/suspension` (endpoints B3-6, en construcción).
 */
@Injectable({ providedIn: 'root' })
export class SuspensionApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/suspension';

  /** Catálogo Tabla 21 SUNAT de tipos de suspensión. */
  catalogo(): Observable<readonly CatSuspensionRow[]> {
    return this.http
      .get<ApiResponse<CatSuspensionRow[]>>(`${this.baseUrl}/catalogo`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Suspensiones registradas de un empleado. */
  listarPorEmpleado(empleadoId: number): Observable<readonly SuspensionRow[]> {
    return this.http
      .get<ApiResponse<SuspensionRow[]>>(`${this.baseUrl}/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Registra una nueva suspensión. */
  crear(input: SuspensionInput): Observable<SuspensionRow> {
    return this.http
      .post<ApiResponse<SuspensionRow>>(this.baseUrl, input)
      .pipe(map(extractApiData));
  }

  /** Edita una suspensión existente. */
  editar(id: number, input: SuspensionInput): Observable<SuspensionRow> {
    return this.http
      .put<ApiResponse<SuspensionRow>>(`${this.baseUrl}/${id}`, input)
      .pipe(map(extractApiData));
  }

  /** Elimina (anula) una suspensión. */
  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }
}
