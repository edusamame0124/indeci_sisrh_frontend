import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  ApiResponse,
  CrearTeletrabajoCabeceraRequest,
  GuardarTeletrabajoDetalleRequest,
  TeletrabajoCatalogo,
  TeletrabajoDetalle,
  TeletrabajoReporte,
  TeletrabajoResumen,
  TeletrabajoTrabajadorItem,
} from '../models/teletrabajo.model';

type BackendResponse<T> =
  | T
  | {
      estado?: string;
      mensaje?: string;
      data: T;
    };

@Injectable({
  providedIn: 'root',
})
export class TeletrabajoApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/rrhh/teletrabajo`;
  private readonly catalogosUrl = `${environment.apiUrl}/catalogos/teletrabajo`;

  buscarTrabajadores(filtro: string): Observable<TeletrabajoTrabajadorItem[]> {
    return this.http
      .get<BackendResponse<TeletrabajoTrabajadorItem[]>>(
        `${environment.apiUrl}/rrhh/empleados/buscar`,
        {
          params: {
            filtro,
          },
        },
      )
      .pipe(map((resp) => this.unwrap(resp)));
  }

  listarReportes(): Observable<TeletrabajoResumen[]> {
    return this.http
      .get<BackendResponse<TeletrabajoResumen[]>>(this.baseUrl)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  obtenerReporte(id: number): Observable<TeletrabajoReporte> {
    return this.http
      .get<BackendResponse<TeletrabajoReporte>>(`${this.baseUrl}/${id}`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  crearCabecera(request: CrearTeletrabajoCabeceraRequest): Observable<number> {
    return this.http
      .post<BackendResponse<number>>(`${this.baseUrl}/cabecera`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  agregarDetalle(request: GuardarTeletrabajoDetalleRequest): Observable<TeletrabajoDetalle | void> {
    return this.http
      .post<BackendResponse<TeletrabajoDetalle | void>>(`${this.baseUrl}/detalle`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarDetalle(
    detalleId: number,
    request: GuardarTeletrabajoDetalleRequest,
  ): Observable<TeletrabajoDetalle | void> {
    return this.http
      .put<
        BackendResponse<TeletrabajoDetalle | void>
      >(`${this.baseUrl}/detalle/${detalleId}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarDetalle(detalleId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/detalle/${detalleId}`);
  }

  eliminarReporte(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  descargarExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/excel`, {
      responseType: 'blob',
    });
  }

  listarModalidades(): Observable<TeletrabajoCatalogo[]> {
    return this.http
      .get<BackendResponse<TeletrabajoCatalogo[]>>(`${this.catalogosUrl}/modalidades`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  listarEstadosCumplimiento(): Observable<TeletrabajoCatalogo[]> {
    return this.http
      .get<BackendResponse<TeletrabajoCatalogo[]>>(`${this.catalogosUrl}/estados-cumplimiento`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  listarConformidades(): Observable<TeletrabajoCatalogo[]> {
    return this.http
      .get<BackendResponse<TeletrabajoCatalogo[]>>(`${this.catalogosUrl}/conformidades`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  private unwrap<T>(resp: BackendResponse<T>): T {
    if (resp && typeof resp === 'object' && 'data' in resp) {
      return resp.data;
    }

    return resp as T;
  }
}
