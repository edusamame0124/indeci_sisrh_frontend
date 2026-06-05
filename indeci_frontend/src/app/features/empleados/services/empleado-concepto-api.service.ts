import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  ConceptosAsignables,
  EmpleadoConceptoInput,
  EmpleadoConceptoRow,
} from '../models/empleado-concepto.model';

/**
 * Asignación de conceptos de planilla por empleado (Spec 009).
 * Backend: `EmpleadoConceptoController` → `/api/rrhh/empleado-concepto`.
 */
@Injectable({ providedIn: 'root' })
export class EmpleadoConceptoApiService {
  private readonly http = inject(HttpClient);

  listarPorEmpleado(empleadoId: number): Observable<readonly EmpleadoConceptoRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoConceptoRow[]>>(
        `/api/rrhh/empleado-concepto/${empleadoId}`,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Conceptos asignables al empleado (ya filtrados por su régimen) + el régimen. */
  listarAsignables(empleadoId: number): Observable<ConceptosAsignables> {
    return this.http
      .get<ApiResponse<ConceptosAsignables>>(
        `/api/rrhh/empleado-concepto/${empleadoId}/asignables`,
      )
      .pipe(map(extractApiData));
  }

  guardar(body: EmpleadoConceptoInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>('/api/rrhh/empleado-concepto', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: EmpleadoConceptoInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/empleado-concepto/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/empleado-concepto/${id}`)
      .pipe(map(extractApiData));
  }
}
