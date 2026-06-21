import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EmpleadoSaludEpsAnularInput,
  EmpleadoSaludEpsInput,
  EmpleadoSaludEpsRow,
  EpsItem,
} from '../models/empleado-salud-eps.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoSaludEpsApiService {
  private readonly http = inject(HttpClient);

  private base(empleadoId: number): string {
    return `/api/rrhh/empleados/${empleadoId}/salud-eps`;
  }

  listarEps(empleadoId: number): Observable<readonly EpsItem[]> {
    return this.http
      .get<ApiResponse<EpsItem[]>>(`${this.base(empleadoId)}/eps`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  actual(empleadoId: number): Observable<EmpleadoSaludEpsRow | null> {
    return this.http
      .get<ApiResponse<EmpleadoSaludEpsRow | null>>(`${this.base(empleadoId)}/actual`)
      .pipe(map(extractApiData));
  }

  historial(empleadoId: number): Observable<readonly EmpleadoSaludEpsRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoSaludEpsRow[]>>(`${this.base(empleadoId)}/historial`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crear(empleadoId: number, body: EmpleadoSaludEpsInput): Observable<EmpleadoSaludEpsRow> {
    return this.http
      .post<ApiResponse<EmpleadoSaludEpsRow>>(this.base(empleadoId), body)
      .pipe(map(extractApiData));
  }

  editar(empleadoId: number, id: number, body: EmpleadoSaludEpsInput): Observable<EmpleadoSaludEpsRow> {
    return this.http
      .put<ApiResponse<EmpleadoSaludEpsRow>>(`${this.base(empleadoId)}/${id}`, body)
      .pipe(map(extractApiData));
  }

  cerrar(empleadoId: number, id: number): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.base(empleadoId)}/${id}/cerrar`, {})
      .pipe(map(() => void 0));
  }

  anular(empleadoId: number, id: number, body: EmpleadoSaludEpsAnularInput): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.base(empleadoId)}/${id}/anular`, body)
      .pipe(map(() => void 0));
  }
}
