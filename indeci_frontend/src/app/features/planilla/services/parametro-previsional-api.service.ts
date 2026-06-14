import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  AfpCatalogRow,
  AfpParametroInput,
  AfpParametroRow,
  HistorialPrevisionalRow,
  OnpParametroInput,
  OnpParametroRow,
  PrevisionalKpi,
  ResolverParametroResult,
} from '../models/parametro-previsional.model';

const BASE = '/api/rrhh/previsional';

/**
 * Administración de parámetros previsionales ONP/AFP por vigencia.
 * Backend: ParametroPrevisionalController → /api/rrhh/previsional.
 */
@Injectable({ providedIn: 'root' })
export class ParametroPrevisionalApiService {
  private readonly http = inject(HttpClient);

  kpi(): Observable<PrevisionalKpi> {
    return this.http
      .get<ApiResponse<PrevisionalKpi>>(`${BASE}/kpi`)
      .pipe(map(extractApiData));
  }

  afpCatalog(): Observable<readonly AfpCatalogRow[]> {
    return this.http
      .get<ApiResponse<AfpCatalogRow[]>>(`${BASE}/afp`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  afpParametros(filtros?: { periodo?: string; afpId?: number; estado?: string }): Observable<readonly AfpParametroRow[]> {
    let params = new HttpParams();
    if (filtros?.periodo) params = params.set('periodo', filtros.periodo);
    if (filtros?.afpId)   params = params.set('afpId', String(filtros.afpId));
    if (filtros?.estado)  params = params.set('estado', filtros.estado);
    return this.http
      .get<ApiResponse<AfpParametroRow[]>>(`${BASE}/afp/parametros`, { params })
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crearAfpParametro(body: AfpParametroInput): Observable<AfpParametroRow> {
    return this.http
      .post<ApiResponse<AfpParametroRow>>(`${BASE}/afp/parametros`, body)
      .pipe(map(extractApiData));
  }

  editarAfpParametro(id: number, body: AfpParametroInput): Observable<AfpParametroRow> {
    return this.http
      .put<ApiResponse<AfpParametroRow>>(`${BASE}/afp/parametros/${id}`, body)
      .pipe(map(extractApiData));
  }

  cerrarAfpVigencia(id: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${BASE}/afp/parametros/${id}/cerrar`, {})
      .pipe(map(extractApiData));
  }

  duplicarAfpVigencia(id: number): Observable<AfpParametroRow> {
    return this.http
      .post<ApiResponse<AfpParametroRow>>(`${BASE}/afp/parametros/${id}/duplicar`, {})
      .pipe(map(extractApiData));
  }

  onpParametros(filtros?: { periodo?: string; estado?: string }): Observable<readonly OnpParametroRow[]> {
    let params = new HttpParams();
    if (filtros?.periodo) params = params.set('periodo', filtros.periodo);
    if (filtros?.estado)  params = params.set('estado', filtros.estado);
    return this.http
      .get<ApiResponse<OnpParametroRow[]>>(`${BASE}/onp/parametros`, { params })
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crearOnpParametro(body: OnpParametroInput): Observable<OnpParametroRow> {
    return this.http
      .post<ApiResponse<OnpParametroRow>>(`${BASE}/onp/parametros`, body)
      .pipe(map(extractApiData));
  }

  editarOnpParametro(id: number, body: OnpParametroInput): Observable<OnpParametroRow> {
    return this.http
      .put<ApiResponse<OnpParametroRow>>(`${BASE}/onp/parametros/${id}`, body)
      .pipe(map(extractApiData));
  }

  cerrarOnpVigencia(id: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${BASE}/onp/parametros/${id}/cerrar`, {})
      .pipe(map(extractApiData));
  }

  resolver(empleadoId: number | null, periodo: string): Observable<ResolverParametroResult> {
    let params = new HttpParams().set('periodo', periodo);
    if (empleadoId != null) params = params.set('empleadoId', String(empleadoId));
    return this.http
      .get<ApiResponse<ResolverParametroResult>>(`${BASE}/resolver`, { params })
      .pipe(map(extractApiData));
  }

  historial(): Observable<readonly HistorialPrevisionalRow[]> {
    return this.http
      .get<ApiResponse<HistorialPrevisionalRow[]>>(`${BASE}/historial`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  auditoria(): Observable<readonly HistorialPrevisionalRow[]> {
    return this.http
      .get<ApiResponse<HistorialPrevisionalRow[]>>(`${BASE}/auditoria`)
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
