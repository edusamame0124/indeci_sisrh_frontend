import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  ConceptoPlanillaInput,
  ConceptoPlanillaRow,
} from '../models/concepto-planilla.model';
import type { ConceptoHistorial } from '../models/concepto-historial.model';

/**
 * CRUD del módulo Conceptos de Planilla (SPEC_CONCEPTOS_PLANILLA — dominio Planilla).
 * Backend: `ConceptoPlanillaController` → `/api/rrhh/concepto-planilla`.
 * Escritura restringida a PLA_WRITE; transiciones sensibles a PLA_APPROVE.
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

  // ─────────────────────────────────────────────────────────────────
  // Transiciones de estado (SPEC_CONCEPTOS_PLANILLA §8/D1 — P1).
  // POST /api/rrhh/concepto-planilla/{id}/{accion} → ApiResponse<Void>.
  // ─────────────────────────────────────────────────────────────────

  /** BORRADOR → EN_REVISION (PLA_WRITE). */
  enviarRevision(id: number): Observable<null> {
    return this.transicion(id, 'enviar-revision');
  }

  /** EN_REVISION → ACTIVO (PLA_APPROVE). */
  activar(id: number): Observable<null> {
    return this.transicion(id, 'activar');
  }

  /** ACTIVO → CERRADO (PLA_APPROVE). */
  cerrar(id: number): Observable<null> {
    return this.transicion(id, 'cerrar');
  }

  /** BORRADOR | EN_REVISION | ACTIVO → ANULADO (PLA_APPROVE). */
  anular(id: number): Observable<null> {
    return this.transicion(id, 'anular');
  }

  private transicion(id: number, accion: string): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`/api/rrhh/concepto-planilla/${id}/${accion}`, {})
      .pipe(map(extractApiData));
  }

  // ─────────────────────────────────────────────────────────────────
  // Historial / versionado (P3 — SPEC_CONCEPTOS_PLANILLA §12 · D5).
  // ─────────────────────────────────────────────────────────────────

  /**
   * Historial del concepto: versiones por código + log de auditoría.
   * `GET /api/rrhh/concepto-planilla/{id}/historial` (PLA_READ).
   */
  historial(id: number): Observable<ConceptoHistorial> {
    return this.http
      .get<ApiResponse<ConceptoHistorial>>(
        `/api/rrhh/concepto-planilla/${id}/historial`,
      )
      .pipe(map(extractApiData));
  }

  /**
   * Crea una nueva versión vigente del concepto hacia adelante (D5: el concepto
   * usado en planilla cerrada no se edita, se versiona). La nueva versión nace
   * en BORRADOR. `POST /{id}/nueva-version` (PLA_WRITE) → id de la nueva versión.
   * Puede responder 400 (NegocioException) por solapamiento de vigencias.
   *
   * @param fechaVigIni inicio de vigencia ISO `yyyy-MM-dd`.
   */
  crearNuevaVersion(id: number, fechaVigIni: string): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(
        `/api/rrhh/concepto-planilla/${id}/nueva-version`,
        { fechaVigIni },
      )
      .pipe(map(extractApiData));
  }
}
