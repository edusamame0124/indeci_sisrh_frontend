import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../../../core/models/api-response.model';
import { extractApiData } from '../../../../../core/http/map-api-response';
import type {
  SubsidioBaseHistoricaResponse,
  SubsidioCasoListParams,
  SubsidioCasoPage,
  SubsidioCasoRequest,
  SubsidioCasoResponse,
  SubsidioCittRequest,
  SubsidioCittResponse,
  SubsidioEstadoCaso,
  SubsidioLiquidacionExplicacion,
  SubsidioLiquidacionResponse,
  SubsidioTimelineEvento,
  SubsidioTramoResponse,
  SubsidioValidacion,
} from '../models/subsidio.models';

/**
 * P0-F3 — Cliente HTTP del módulo Subsidios.
 * Backend: {@code SubsidioController} → `/api/rrhh/subsidios`.
 */
@Injectable({ providedIn: 'root' })
export class SubsidioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/subsidios';

  listarCasos(params: SubsidioCasoListParams): Observable<SubsidioCasoPage> {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('size', String(params.size));
    if (params.periodo) httpParams = httpParams.set('periodo', params.periodo);
    if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    if (params.empleadoId != null) {
      httpParams = httpParams.set('empleadoId', String(params.empleadoId));
    }
    if (params.dni) httpParams = httpParams.set('dni', params.dni);
    return this.http
      .get<ApiResponse<SubsidioCasoPage>>(`${this.baseUrl}/casos`, { params: httpParams })
      .pipe(map(extractApiData));
  }

  obtenerCaso(id: number): Observable<SubsidioCasoResponse> {
    return this.http
      .get<ApiResponse<SubsidioCasoResponse>>(`${this.baseUrl}/casos/${id}`)
      .pipe(map(extractApiData));
  }

  crearCaso(dto: SubsidioCasoRequest): Observable<SubsidioCasoResponse> {
    return this.http
      .post<ApiResponse<SubsidioCasoResponse>>(`${this.baseUrl}/casos`, dto)
      .pipe(map(extractApiData));
  }

  actualizarCaso(id: number, dto: SubsidioCasoRequest): Observable<SubsidioCasoResponse> {
    return this.http
      .put<ApiResponse<SubsidioCasoResponse>>(`${this.baseUrl}/casos/${id}`, dto)
      .pipe(map(extractApiData));
  }

  cambiarEstado(id: number, estado: SubsidioEstadoCaso): Observable<SubsidioCasoResponse> {
    return this.http
      .put<ApiResponse<SubsidioCasoResponse>>(
        `${this.baseUrl}/casos/${id}/estado/${estado}`,
        null,
      )
      .pipe(map(extractApiData));
  }

  timeline(casoId: number): Observable<readonly SubsidioTimelineEvento[]> {
    return this.http
      .get<ApiResponse<SubsidioTimelineEvento[]>>(`${this.baseUrl}/casos/${casoId}/timeline`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  validaciones(casoId: number): Observable<readonly SubsidioValidacion[]> {
    return this.http
      .get<ApiResponse<SubsidioValidacion[]>>(`${this.baseUrl}/casos/${casoId}/validaciones`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarCitt(casoId: number): Observable<readonly SubsidioCittResponse[]> {
    return this.http
      .get<ApiResponse<SubsidioCittResponse[]>>(`${this.baseUrl}/casos/${casoId}/citt`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  registrarCitt(casoId: number, dto: SubsidioCittRequest): Observable<SubsidioCittResponse> {
    return this.http
      .post<ApiResponse<SubsidioCittResponse>>(`${this.baseUrl}/casos/${casoId}/citt`, dto)
      .pipe(map(extractApiData));
  }

  generarTramos(casoId: number): Observable<readonly SubsidioTramoResponse[]> {
    return this.http
      .post<ApiResponse<SubsidioTramoResponse[]>>(
        `${this.baseUrl}/casos/${casoId}/tramos/generar`,
        null,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  calcularBase(casoId: number): Observable<SubsidioBaseHistoricaResponse> {
    return this.http
      .post<ApiResponse<SubsidioBaseHistoricaResponse>>(
        `${this.baseUrl}/casos/${casoId}/base-historica/calcular`,
        null,
      )
      .pipe(map(extractApiData));
  }

  obtenerBase(casoId: number): Observable<SubsidioBaseHistoricaResponse> {
    return this.http
      .get<ApiResponse<SubsidioBaseHistoricaResponse>>(
        `${this.baseUrl}/casos/${casoId}/base-historica`,
      )
      .pipe(map(extractApiData));
  }

  calcularLiquidacion(tramoId: number): Observable<SubsidioLiquidacionResponse> {
    return this.http
      .post<ApiResponse<SubsidioLiquidacionResponse>>(
        `${this.baseUrl}/tramos/${tramoId}/liquidaciones/calcular`,
        null,
      )
      .pipe(map(extractApiData));
  }

  historialLiquidaciones(tramoId: number): Observable<readonly SubsidioLiquidacionResponse[]> {
    return this.http
      .get<ApiResponse<SubsidioLiquidacionResponse[]>>(
        `${this.baseUrl}/tramos/${tramoId}/liquidaciones`,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  explicacionLiquidacion(liquidacionId: number): Observable<SubsidioLiquidacionExplicacion> {
    return this.http
      .get<ApiResponse<SubsidioLiquidacionExplicacion>>(
        `${this.baseUrl}/liquidaciones/${liquidacionId}/explicacion`,
      )
      .pipe(map(extractApiData));
  }

  aplicarPlanilla(liquidacionId: number): Observable<SubsidioLiquidacionResponse> {
    return this.http
      .post<ApiResponse<SubsidioLiquidacionResponse>>(
        `${this.baseUrl}/liquidaciones/${liquidacionId}/aplicar-planilla`,
        null,
      )
      .pipe(map(extractApiData));
  }

  revertirPlanilla(
    liquidacionId: number,
    motivo: string,
  ): Observable<SubsidioLiquidacionResponse> {
    return this.http
      .post<ApiResponse<SubsidioLiquidacionResponse>>(
        `${this.baseUrl}/liquidaciones/${liquidacionId}/revertir`,
        { motivo },
      )
      .pipe(map(extractApiData));
  }
}
