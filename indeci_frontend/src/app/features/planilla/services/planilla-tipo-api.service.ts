import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  PlanillaTipo,
  PlanillaTipoInput,
} from '../models/planilla-tipo.model';

/**
 * Catálogo "Tipo de planilla" (SPEC_CONCEPTOS_PLANILLA §15 — Fase A).
 * Backend: `PlanillaTipoController` → `/api/rrhh/planilla-tipo`.
 *
 * <p>Lectura PLA_READ (listar activos ordenados); escritura PLA_WRITE
 * (crear/actualizar/baja lógica) para la pantalla de administración.</p>
 */
@Injectable({ providedIn: 'root' })
export class PlanillaTipoApiService {
  private readonly http = inject(HttpClient);

  private static readonly BASE = '/api/rrhh/planilla-tipo';

  /** Tipos de planilla activos, ordenados por `orden` (lo garantiza el backend). */
  listar(): Observable<readonly PlanillaTipo[]> {
    return this.http
      .get<ApiResponse<PlanillaTipo[]>>(PlanillaTipoApiService.BASE)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Alta de un tipo de planilla (PLA_WRITE). Rechaza código duplicado/blank (400). */
  crear(body: PlanillaTipoInput): Observable<PlanillaTipo> {
    return this.http
      .post<ApiResponse<PlanillaTipo>>(PlanillaTipoApiService.BASE, body)
      .pipe(map(extractApiData));
  }

  /** Edición de un tipo de planilla por código (PLA_WRITE). */
  actualizar(codigo: string, body: PlanillaTipoInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(
        `${PlanillaTipoApiService.BASE}/${encodeURIComponent(codigo)}`,
        body,
      )
      .pipe(map(extractApiData));
  }

  /** Baja lógica de un tipo de planilla (PLA_WRITE). */
  eliminar(codigo: string): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(
        `${PlanillaTipoApiService.BASE}/${encodeURIComponent(codigo)}`,
      )
      .pipe(map(extractApiData));
  }
}
