import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  MetaCertificacionInput,
  SemaforoPresupuestal,
} from '../models/semaforo-presupuestal.model';

/**
 * Spec 012 / C1 · P-05 — Semáforo presupuestal por meta.
 * Backend: `MetaPresupuestalController` → `/api/rrhh/meta-presupuestal`.
 */
@Injectable({ providedIn: 'root' })
export class MetaPresupuestalApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/meta-presupuestal';

  /** Semáforo del período: certificado vs comprometido por meta. */
  semaforo(periodoId: number): Observable<SemaforoPresupuestal> {
    return this.http
      .get<ApiResponse<SemaforoPresupuestal>>(`${this.baseUrl}/semaforo/${periodoId}`)
      .pipe(map(extractApiData));
  }

  /** Registra (upsert) los montos certificados por meta del período. */
  guardar(periodoId: number, entradas: readonly MetaCertificacionInput[]): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/${periodoId}`, entradas)
      .pipe(map(extractApiData));
  }
}
