import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ConceptoTipoInterno } from '../models/concepto-tipo-interno.model';

/**
 * Catálogo "Tipo de Concepto" (taxonomía funcional SISPER, 8 valores activos).
 * Backend: `GET /api/rrhh/concepto-tipo-interno` (PLA_READ).
 * Fuente: SPEC_CONCEPTOS_PLANILLA §13 (ajuste 2026-06-24).
 */
@Injectable({ providedIn: 'root' })
export class ConceptoTipoInternoApiService {
  private readonly http = inject(HttpClient);

  /** Ítems activos ordenados por `orden` ascendente (lo garantiza el backend). */
  listar(): Observable<readonly ConceptoTipoInterno[]> {
    return this.http
      .get<ApiResponse<ConceptoTipoInterno[]>>('/api/rrhh/concepto-tipo-interno')
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
