import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  AcumulacionDecisionDto,
  AcumulacionDecisionPayload,
  HistorialSaldoRow,
  PadronVacacionalPageDto,
  ProvisionarAutoPayload,
  RecalculoManualResult
} from '../models/padron-vacacional.model';

@Injectable({
  providedIn: 'root'
})
export class PadronVacacionalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rrhh/vacaciones/padron`;

  consultar(q: string = '', page: number = 0, size: number = 25): Observable<ApiResponse<PadronVacacionalPageDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }

    return this.http.get<ApiResponse<PadronVacacionalPageDto>>(this.baseUrl, { params });
  }

  registrarGoceDirecto(payload: import('../models/padron-vacacional.model').GoceDirectoPayload): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/goce-directo`, payload);
  }

  importarBaseline(file: File): Observable<ApiResponse<import('../../../core/models/api-response.model').ApiResponse<any>>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/rrhh/vacaciones/importar-baseline`, formData);
  }

  /** F9.3 — registra la decisión de RR.HH. sobre la acumulación de un empleado (auditoría). */
  registrarDecisionAcumulacion(
    empleadoId: number,
    payload: AcumulacionDecisionPayload
  ): Observable<ApiResponse<AcumulacionDecisionDto>> {
    return this.http.post<ApiResponse<AcumulacionDecisionDto>>(
      `${this.baseUrl}/${empleadoId}/acumulacion-decision`,
      payload
    );
  }

  /** F9.3 — historial de decisiones de acumulación registradas para un empleado. */
  listarDecisionesAcumulacion(empleadoId: number): Observable<ApiResponse<AcumulacionDecisionDto[]>> {
    return this.http.get<ApiResponse<AcumulacionDecisionDto[]>>(
      `${this.baseUrl}/${empleadoId}/acumulacion-decision`
    );
  }

  /**
   * "Provisionar Auto": recalcula TODO el saldo vacacional del empleado con el récord real
   * (récord por año de aniversario + LSG/faltas). Las filas mal calculadas se anulan
   * (soft-delete) y se reemplazan por una fila nueva y limpia — nunca se editan in-place.
   * El sustento es obligatorio (Poka-Yoke).
   */
  provisionarAuto(empleadoId: number, payload: ProvisionarAutoPayload): Observable<ApiResponse<RecalculoManualResult>> {
    return this.http.post<ApiResponse<RecalculoManualResult>>(
      `${this.baseUrl}/${empleadoId}/provisionar-auto`,
      payload
    );
  }

  /** Trazabilidad Visual — historial completo (activos + anulados) del saldo de un empleado. */
  historialSaldo(empleadoId: number): Observable<ApiResponse<HistorialSaldoRow[]>> {
    return this.http.get<ApiResponse<HistorialSaldoRow[]>>(
      `${this.baseUrl}/${empleadoId}/historial-saldo`
    );
  }
}
