import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { PersonaEmpleado, PersonaEmpleadoInput } from '../models/persona-empleado.model';

@Injectable({ providedIn: 'root' })
export class PersonaApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<readonly PersonaEmpleado[]> {
    return this.http
      .get<ApiResponse<PersonaEmpleado[]>>('/api/rrhh/persona')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  obtenerPorId(id: number): Observable<PersonaEmpleado> {
    return this.http
      .get<ApiResponse<PersonaEmpleado>>(`/api/rrhh/persona/${id}`)
      .pipe(map(extractApiData));
  }

  guardar(body: PersonaEmpleadoInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>('/api/rrhh/persona', body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: PersonaEmpleadoInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/persona/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`/api/rrhh/persona/${id}`)
      .pipe(map(extractApiData));
  }
}
