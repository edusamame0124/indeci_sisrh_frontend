import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ConceptoRtps } from '../models/concepto-rtps.model';

/**
 * Catálogo "Tipo Concepto RTPS" / PDT 601 (SPEC_CONCEPTOS_PLANILLA §10 — P1).
 * Backend: `ConceptoRtpsController` → `GET /api/rrhh/concepto-rtps` (PLA_READ).
 */
@Injectable({ providedIn: 'root' })
export class ConceptoRtpsApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<readonly ConceptoRtps[]> {
    return this.http
      .get<ApiResponse<ConceptoRtps[]>>('/api/rrhh/concepto-rtps')
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
