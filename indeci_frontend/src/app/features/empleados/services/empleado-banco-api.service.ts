import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { EmpleadoBancoInput, EmpleadoBancoRow } from '../models/empleado-banco.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoBancoApiService {
  private readonly http = inject(HttpClient);

  listar(empleadoId: number): Observable<readonly EmpleadoBancoRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoBancoRow[]>>(`/api/rrhh/banco/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  guardar(body: EmpleadoBancoInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>('/api/rrhh/banco', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: EmpleadoBancoInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/banco/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/banco/${id}`)
      .pipe(map(extractApiData));
  }
}
