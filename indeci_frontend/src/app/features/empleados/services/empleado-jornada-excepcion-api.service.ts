import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EmpleadoJornadaExcepcionInput,
  EmpleadoJornadaExcepcionRow,
} from '../models/empleado-jornada-excepcion.model';

const BASE_URL = '/api/rrhh/empleado-jornada-excepcion';

@Injectable({ providedIn: 'root' })
export class EmpleadoJornadaExcepcionApiService {
  private readonly http = inject(HttpClient);

  listarPorEmpleado(empleadoId: number): Observable<readonly EmpleadoJornadaExcepcionRow[]> {
    return this.http
      .get<ApiResponse<EmpleadoJornadaExcepcionRow[]>>(`${BASE_URL}/empleado/${empleadoId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  registrar(input: EmpleadoJornadaExcepcionInput): Observable<null> {
    return this.http.post<ApiResponse<null>>(BASE_URL, input).pipe(map(extractApiData));
  }

  actualizar(id: number, input: EmpleadoJornadaExcepcionInput): Observable<null> {
    return this.http.put<ApiResponse<null>>(`${BASE_URL}/${id}`, input).pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http.delete<ApiResponse<null>>(`${BASE_URL}/${id}`).pipe(map(extractApiData));
  }
}
