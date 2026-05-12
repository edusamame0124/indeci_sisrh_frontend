import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { UbigeoOption } from '../models/ubigeo.model';
import type {
  BankAccountTypeCatalogItem,
  BankCatalogItem,
} from '../models/catalog-item.model';

/** Payload escritura catálogo banco/tipo (contrato reservado BKD-001). */
export interface CatalogoNombrePayload {
  readonly name: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogoApiService {
  private readonly http = inject(HttpClient);

  /** Distritos con jerarquía departamento/provincia (selector). */
  listarUbigeo(): Observable<readonly UbigeoOption[]> {
    return this.http
      .get<ApiResponse<UbigeoOption[]>>('/api/catalogos/ubigeo')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarBancos(): Observable<readonly BankCatalogItem[]> {
    return this.http
      .get<ApiResponse<BankCatalogItem[]>>('/api/catalogos/bancos')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarTiposCuenta(): Observable<readonly BankAccountTypeCatalogItem[]> {
    return this.http
      .get<ApiResponse<BankAccountTypeCatalogItem[]>>('/api/catalogos/tipos-cuenta')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crearBanco(payload: CatalogoNombrePayload): Observable<BankCatalogItem> {
    return this.http
      .post<ApiResponse<BankCatalogItem>>('/api/catalogos/bancos', payload)
      .pipe(map((r) => extractApiData(r)));
  }

  actualizarBanco(id: number, payload: CatalogoNombrePayload): Observable<BankCatalogItem> {
    return this.http
      .put<ApiResponse<BankCatalogItem>>(`/api/catalogos/bancos/${id}`, payload)
      .pipe(map((r) => extractApiData(r)));
  }

  eliminarBanco(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`/api/catalogos/bancos/${id}`)
      .pipe(map(() => undefined));
  }

  crearTipoCuenta(payload: CatalogoNombrePayload): Observable<BankAccountTypeCatalogItem> {
    return this.http
      .post<ApiResponse<BankAccountTypeCatalogItem>>('/api/catalogos/tipos-cuenta', payload)
      .pipe(map((r) => extractApiData(r)));
  }

  actualizarTipoCuenta(
    id: number,
    payload: CatalogoNombrePayload,
  ): Observable<BankAccountTypeCatalogItem> {
    return this.http
      .put<ApiResponse<BankAccountTypeCatalogItem>>(
        `/api/catalogos/tipos-cuenta/${id}`,
        payload,
      )
      .pipe(map((r) => extractApiData(r)));
  }

  eliminarTipoCuenta(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`/api/catalogos/tipos-cuenta/${id}`)
      .pipe(map(() => undefined));
  }
}
