import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EncargaturaFiltroEstado,
  EncargaturaRequest,
  EncargaturaResponse,
} from '../models/encargatura.model';

/**
 * F5.2 — Cliente HTTP del CRUD de encargaturas.
 *
 * Backend: {@code EmpleadoEncargaturaController} → `/api/rrhh/encargatura`.
 */
@Injectable({ providedIn: 'root' })
export class EncargaturaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/encargatura';

  listar(estado: EncargaturaFiltroEstado = 'TODOS'): Observable<readonly EncargaturaResponse[]> {
    const params = new HttpParams().set('estado', estado);
    return this.http
      .get<ApiResponse<EncargaturaResponse[]>>(this.baseUrl, { params })
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crear(body: EncargaturaRequest): Observable<EncargaturaResponse> {
    return this.http
      .post<ApiResponse<EncargaturaResponse>>(this.baseUrl, body)
      .pipe(map(extractApiData));
  }

  actualizar(id: number, body: EncargaturaRequest): Observable<EncargaturaResponse> {
    return this.http
      .put<ApiResponse<EncargaturaResponse>>(`${this.baseUrl}/${id}`, body)
      .pipe(map(extractApiData));
  }

  /** Pasa a CULMINADO. Si fechaFin es null el backend usa LocalDate.now(). */
  cerrar(id: number, fechaFin: string | null): Observable<EncargaturaResponse> {
    let params = new HttpParams();
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    return this.http
      .put<ApiResponse<EncargaturaResponse>>(`${this.baseUrl}/${id}/cerrar`, null, { params })
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }
}
