import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import {
  sanitizeAuditAccionFilter,
  sanitizeAuditIpFilter,
  sanitizeAuditUsuarioFilter,
} from '../../../core/utils/audit-query-sanitize';

import type {
  AdminAuditoriaPage,
  AdminAuditoriaRow,
  AdminPermisoRow,
  AdminRolRow,
  AdminUserCreateRequest,
  AdminUserDetail,
  AdminUserPage,
  AdminUserPermisoDeniesPut,
  AdminUserRolesPut,
  AdminUserStatusPatch,
} from '../models/admin.models';

const BASE = '/api/admin';

/** Filtros consulta auditoría (cliente sanitiza strings; servidor es autoridad). */
export interface AdminAuditQuery {
  readonly usuario?: string;
  readonly accion?: string;
  readonly fechaDesde?: string;
  readonly fechaHasta?: string;
  readonly ip?: string;
  readonly page: number;
  readonly size: number;
}

export interface PermisoDeniedRow {
  readonly permisoId: number;
  readonly codigo?: string;
  readonly nombre?: string;
}

function optionalParam(params: HttpParams, key: string, value?: string): HttpParams {
  return value && value.length > 0 ? params.set(key, value) : params;
}

/**
 * Consumo endpoints `/api/admin/**` definidos en `specs/007-frontend-admin/contracts/admin-api.contract.md`.
 * Operaciones fallan hasta que existan controllers servidor autorizados.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  listUsersPaged(page: number, size: number, q?: string): Observable<AdminUserPage> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (q && q.trim().length > 0) {
      params = params.set('q', sanitizeAuditUsuarioFilter(q));
    }

    return this.http
      .get<ApiResponse<AdminUserPage>>(`${BASE}/users`, { params })
      .pipe(map((res) => extractApiData(res)));
  }

  getUser(id: number): Observable<AdminUserDetail> {
    return this.http
      .get<ApiResponse<AdminUserDetail>>(`${BASE}/users/${id}`)
      .pipe(map((res) => extractApiData(res)));
  }

  createUser(body: AdminUserCreateRequest): Observable<AdminUserDetail> {
    return this.http
      .post<ApiResponse<AdminUserDetail>>(`${BASE}/users`, body)
      .pipe(map((res) => extractApiData(res)));
  }

  patchUserStatus(id: number, body: AdminUserStatusPatch): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${BASE}/users/${id}/status`, body)
      .pipe(map(() => undefined));
  }

  putUserRoles(id: number, body: AdminUserRolesPut): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${BASE}/users/${id}/roles`, body)
      .pipe(map(() => undefined));
  }

  resetUserPassword(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${BASE}/users/${id}/reset-password`, {})
      .pipe(map(() => undefined));
  }

  /** Detalle opcional desde servidor (si no viene en AdminUserDetail). */
  listUserDeniedPermissions(id: number): Observable<readonly PermisoDeniedRow[]> {
    return this.http
      .get<ApiResponse<readonly PermisoDeniedRow[]>>(`${BASE}/users/${id}/permiso-denegados`)
      .pipe(map((res) => extractApiData(res)));
  }

  putUserDeniedPermissions(id: number, body: AdminUserPermisoDeniesPut): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${BASE}/users/${id}/permiso-denegados`, body)
      .pipe(map(() => undefined));
  }

  listRoles(): Observable<readonly AdminRolRow[]> {
    return this.http
      .get<ApiResponse<readonly AdminRolRow[]>>(`${BASE}/roles`)
      .pipe(map((res) => [...extractApiData(res)]));
  }

  listPermisos(): Observable<readonly AdminPermisoRow[]> {
    return this.http
      .get<ApiResponse<readonly AdminPermisoRow[]>>(`${BASE}/permissions`)
      .pipe(map((res) => [...extractApiData(res)]));
  }

  queryAuditoria(query: AdminAuditQuery): Observable<AdminAuditoriaPage> {
    let params = new HttpParams().set('page', String(query.page)).set('size', String(query.size));
    params = optionalParam(params, 'usuario', sanitizeAuditUsuarioFilter(query.usuario ?? ''));
    params = optionalParam(params, 'accion', sanitizeAuditAccionFilter(query.accion ?? ''));
    params = optionalParam(params, 'ip', sanitizeAuditIpFilter(query.ip ?? ''));
    params = optionalParam(params, 'fechaDesde', (query.fechaDesde ?? '').trim());
    params = optionalParam(params, 'fechaHasta', (query.fechaHasta ?? '').trim());

    return this.http
      .get<ApiResponse<AdminAuditoriaPage>>(`${BASE}/auditoria`, { params })
      .pipe(map((res) => extractApiData(res)));
  }

  fetchAuditoriaAllForExport(
    query: Omit<AdminAuditQuery, 'page' | 'size'>,
  ): Observable<readonly AdminAuditoriaRow[]> {
    const maxRows = 500;
    const pageSize = 100;

    return new Observable<readonly AdminAuditoriaRow[]>((subscriber) => {
      let page = 0;
      const acc: AdminAuditoriaRow[] = [];

      const pump = (): void => {
        this.queryAuditoria({ ...query, page, size: pageSize }).subscribe({
          next: (p) => {
            for (const row of p.content) {
              if (acc.length >= maxRows) break;
              acc.push(row);
            }

            const more = acc.length < maxRows && page + 1 < p.totalPages;
            if (!more) {
              subscriber.next(acc);
              subscriber.complete();
              return;
            }
            page += 1;
            pump();
          },
          error: (e) => subscriber.error(e),
        });
      };

      pump();
    });
  }
}
