import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  ConceptoPlanillaInput,
  ConceptoPlanillaRow,
} from '../models/concepto-planilla.model';

/**
 * CRUD del catálogo Conceptos de Planilla (Spec 009 — Módulo 1).
 * Backend: `ConceptoPlanillaController` → `/api/rrhh/concepto-planilla`.
 * Escritura restringida a ADMIN / SUPER_ADMIN (verificación en la página).
 */
@Injectable({ providedIn: 'root' })
export class ConceptoPlanillaApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<readonly ConceptoPlanillaRow[]> {
    return this.http
      .get<ApiResponse<ConceptoPlanillaRow[]>>('/api/rrhh/concepto-planilla')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  guardar(body: ConceptoPlanillaInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>('/api/rrhh/concepto-planilla', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: ConceptoPlanillaInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/concepto-planilla/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/concepto-planilla/${id}`)
      .pipe(map(extractApiData));
  }
}
