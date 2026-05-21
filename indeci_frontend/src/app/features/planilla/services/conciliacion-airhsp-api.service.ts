import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  ConciliacionAirhspRow,
  ConciliacionRevisionInput,
} from '../models/conciliacion-airhsp.model';

/**
 * Conciliación AIRHSP M13 (SPEC §12.2 PANTALLA-06).
 * Backend: `ConciliacionAirhspController` → `/api/rrhh/conciliacion-airhsp`.
 */
@Injectable({ providedIn: 'root' })
export class ConciliacionAirhspApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/conciliacion-airhsp';

  /** Conciliaciones de un período (por id de `INDECI_PERIODO_PLANILLA`). */
  listarPorPeriodo(periodoPlanillaId: number): Observable<readonly ConciliacionAirhspRow[]> {
    return this.http
      .get<ApiResponse<ConciliacionAirhspRow[]>>(`${this.baseUrl}/periodo/${periodoPlanillaId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Revisa una conciliación (CONCILIADO / JUSTIFICADO / RECHAZADO). */
  revisar(id: number, body: ConciliacionRevisionInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/${id}/revisar`, body)
      .pipe(map(extractApiData));
  }
}
