import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EstadoIr4ta,
  Ir4taConfigAnularInput,
  Ir4taConfigDuplicarInput,
  Ir4taConfigInput,
  Ir4taConfigRow,
  Ir4taResolverResult,
} from '../models/ir4ta-config.model';

const BASE = '/api/rrhh/ir4ta/config';

/**
 * Servicio HTTP para configuraciones anuales de IR 4ta Categoría CAS.
 * Backend: Ir4taConfigController → /api/rrhh/ir4ta/config.
 * Base normativa: TUO LIR Art. 33 inc. e) · D.S. 122-94-EF · SUNAT 3042.
 */
@Injectable({ providedIn: 'root' })
export class Ir4taConfigApiService {
  private readonly http = inject(HttpClient);

  listar(filtros?: { estado?: EstadoIr4ta | ''; incluirAnulados?: boolean }): Observable<readonly Ir4taConfigRow[]> {
    let params = new HttpParams();
    if (filtros?.estado)          params = params.set('estado', filtros.estado);
    if (filtros?.incluirAnulados) params = params.set('incluirAnulados', 'true');
    return this.http
      .get<ApiResponse<Ir4taConfigRow[]>>(BASE, { params })
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crear(body: Ir4taConfigInput): Observable<Ir4taConfigRow> {
    return this.http
      .post<ApiResponse<Ir4taConfigRow>>(BASE, body)
      .pipe(map(extractApiData));
  }

  editar(id: number, body: Ir4taConfigInput): Observable<Ir4taConfigRow> {
    return this.http
      .put<ApiResponse<Ir4taConfigRow>>(`${BASE}/${id}`, body)
      .pipe(map(extractApiData));
  }

  publicar(id: number): Observable<Ir4taConfigRow> {
    return this.http
      .post<ApiResponse<Ir4taConfigRow>>(`${BASE}/${id}/publicar`, {})
      .pipe(map(extractApiData));
  }

  cerrar(id: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${BASE}/${id}/cerrar`, {})
      .pipe(map(extractApiData));
  }

  duplicar(id: number, body: Ir4taConfigDuplicarInput): Observable<Ir4taConfigRow> {
    return this.http
      .post<ApiResponse<Ir4taConfigRow>>(`${BASE}/${id}/duplicar`, body)
      .pipe(map(extractApiData));
  }

  eliminar(id: number, body: Ir4taConfigAnularInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${BASE}/${id}/eliminar`, body)
      .pipe(map(extractApiData));
  }

  resolver(periodo: string): Observable<Ir4taResolverResult> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .get<ApiResponse<Ir4taResolverResult>>(`${BASE}/resolver`, { params })
      .pipe(map(extractApiData));
  }
}
