import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  EssaludAnularInput,
  EssaludDuplicarInput,
  EssaludResolverResult,
  EssaludVigenciaInput,
  EssaludVigenciaRow,
  EstadoEssalud,
} from '../models/essalud.model';

const BASE = '/api/rrhh/essalud';

@Injectable({ providedIn: 'root' })
export class EssaludApiService {
  private readonly http = inject(HttpClient);

  listarVigencias(filtros?: { estado?: EstadoEssalud; incluirAnulados?: boolean }): Observable<readonly EssaludVigenciaRow[]> {
    let params = new HttpParams();
    if (filtros?.estado)          params = params.set('estado', filtros.estado);
    if (filtros?.incluirAnulados) params = params.set('incluirAnulados', 'true');
    return this.http
      .get<ApiResponse<EssaludVigenciaRow[]>>(`${BASE}/vigencias`, { params })
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crearVigencia(body: EssaludVigenciaInput): Observable<EssaludVigenciaRow> {
    return this.http
      .post<ApiResponse<EssaludVigenciaRow>>(`${BASE}/vigencias`, body)
      .pipe(map(extractApiData));
  }

  editarVigencia(id: number, body: EssaludVigenciaInput): Observable<EssaludVigenciaRow> {
    return this.http
      .put<ApiResponse<EssaludVigenciaRow>>(`${BASE}/vigencias/${id}`, body)
      .pipe(map(extractApiData));
  }

  cerrarVigencia(id: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${BASE}/vigencias/${id}/cerrar`, {})
      .pipe(map(extractApiData));
  }

  duplicarVigencia(id: number, body: EssaludDuplicarInput): Observable<EssaludVigenciaRow> {
    return this.http
      .post<ApiResponse<EssaludVigenciaRow>>(`${BASE}/vigencias/${id}/duplicar`, body)
      .pipe(map(extractApiData));
  }

  eliminarVigencia(id: number, body: EssaludAnularInput): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${BASE}/vigencias/${id}/eliminar`, body)
      .pipe(map(extractApiData));
  }

  resolver(empleadoId: number, periodo: string, tieneEps?: boolean): Observable<EssaludResolverResult> {
    let params = new HttpParams()
      .set('empleadoId', String(empleadoId))
      .set('periodo', periodo);
    if (tieneEps != null) params = params.set('tieneEps', String(tieneEps));
    return this.http
      .get<ApiResponse<EssaludResolverResult>>(`${BASE}/resolver`, { params })
      .pipe(map(extractApiData));
  }
}
