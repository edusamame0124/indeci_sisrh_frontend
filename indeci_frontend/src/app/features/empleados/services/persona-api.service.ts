import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  MiPerfilUpdateInput,
  PersonaEmpleado,
  PersonaEmpleadoInput,
  PersonaPage,
  PersonaResumen,
} from '../models/persona-empleado.model';

@Injectable({ providedIn: 'root' })
export class PersonaApiService {
  private readonly http = inject(HttpClient);

  /** Listado completo (1 query JOIN) — usado por hubs y pickers. */
  listar(): Observable<readonly PersonaResumen[]> {
    return this.http
      .get<ApiResponse<PersonaResumen[]>>('/api/rrhh/persona')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Listado paginado con búsqueda server-side — usado por la pantalla principal. */
  listarPaginado(page: number, size: number, q: string): Observable<PersonaPage> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (q.trim()) params = params.set('q', q.trim());
    return this.http
      .get<ApiResponse<PersonaPage>>('/api/rrhh/persona/page', { params })
      .pipe(map(extractApiData));
  }

  obtenerPorId(id: number): Observable<PersonaEmpleado> {
    return this.http
      .get<ApiResponse<PersonaEmpleado>>(`/api/rrhh/persona/${id}`)
      .pipe(map(extractApiData));
  }

  guardar(body: PersonaEmpleadoInput): Observable<null> {
    return this.http.post<ApiResponse<null>>('/api/rrhh/persona', body).pipe(map(extractApiData));
  }

  actualizar(id: number, body: PersonaEmpleadoInput): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`/api/rrhh/persona/${id}`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http.delete<ApiResponse<null>>(`/api/rrhh/persona/${id}`).pipe(map(extractApiData));
  }
  obtenerMiPerfil(): Observable<PersonaEmpleado> {
    return this.http
      .get<ApiResponse<PersonaEmpleado>>('/api/rrhh/persona/me')
      .pipe(map(extractApiData));
  }

  actualizarMiPerfil(body: MiPerfilUpdateInput): Observable<PersonaEmpleado> {
    return this.http
      .put<ApiResponse<PersonaEmpleado>>('/api/rrhh/persona/me', body)
      .pipe(map(extractApiData));
  }
  obtenerFotoMiPerfil(): Observable<Blob> {
  return this.http.get('/api/rrhh/persona/me/foto', {
    responseType: 'blob',
  });
}

actualizarFotoMiPerfil(file: File): Observable<null> {
  const formData = new FormData();
  formData.append('file', file);

  return this.http
    .post<ApiResponse<null>>(
      '/api/rrhh/persona/me/foto',
      formData,
    )
    .pipe(map(extractApiData));
}
}
