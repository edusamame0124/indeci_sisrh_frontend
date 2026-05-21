import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EstimacionNetoInput,
  EstimacionNetoResult,
} from '../models/estimacion-neto.model';

/**
 * Spec 013 / C1 — Preview de neto del modal "Asignar Descuento / Ajuste Manual".
 * Backend: `EstimacionNetoController` → `POST /api/rrhh/empleados/{id}/estimar-neto`.
 * Solo lectura: estima el neto, no graba nada.
 */
@Injectable({ providedIn: 'root' })
export class EstimacionNetoApiService {
  private readonly http = inject(HttpClient);

  estimarNeto(
    empleadoId: number,
    body: EstimacionNetoInput,
  ): Observable<EstimacionNetoResult> {
    return this.http
      .post<ApiResponse<EstimacionNetoResult>>(
        `/api/rrhh/empleados/${empleadoId}/estimar-neto`,
        body,
      )
      .pipe(map(extractApiData));
  }
}
