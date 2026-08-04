import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  AcumulacionDecisionDto,
  AcumulacionDecisionPayload,
  CorreccionGozadosResult,
  CorregirGozadosPayload,
  GoceRegistrado,
  HistorialSaldoRow,
  PadronVacacionalPageDto,
  ProvisionarAutoPayload,
  ProvisionMasivaResult,
  RecalculoManualResult,
  RecordVacacionalDetalle
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

  /**
   * "Provisionar para todos": recalcula Corresponden y conserva Gozados para TODOS los empleados
   * con baseline importado, en un solo clic. Sustento obligatorio.
   */
  provisionarTodos(payload: ProvisionarAutoPayload): Observable<ApiResponse<ProvisionMasivaResult>> {
    return this.http.post<ApiResponse<ProvisionMasivaResult>>(
      `${this.baseUrl}/provisionar-todos`,
      payload
    );
  }

  /**
   * "Editar Gozados": corrige el TOTAL de días gozados de un empleado a un valor arbitrario
   * (dato migrado incompleto, error de digitación, goce gestionado fuera de papeletas). El
   * motivo es obligatorio (Poka-Yoke); queda auditado y como fila nueva en el histórico de
   * goces. Saldo/Récord se recalculan solos al recargar el padrón.
   */
  corregirGozados(empleadoId: number, payload: CorregirGozadosPayload): Observable<ApiResponse<CorreccionGozadosResult>> {
    return this.http.post<ApiResponse<CorreccionGozadosResult>>(
      `${this.baseUrl}/${empleadoId}/corregir-gozados`,
      payload
    );
  }

  /**
   * Detalle de récord vacacional (Opción A): acumulado de la carrera (reconcilia con Vinculación)
   * + desglose POR PERÍODO (aniversario a aniversario) con sus incidencias y si cumple récord.
   */
  recordDetalle(empleadoId: number): Observable<ApiResponse<RecordVacacionalDetalle>> {
    return this.http.get<ApiResponse<RecordVacacionalDetalle>>(
      `${this.baseUrl}/${empleadoId}/record-detalle`
    );
  }

  /** Trazabilidad Visual — historial completo (activos + anulados) del saldo de un empleado. */
  historialSaldo(empleadoId: number): Observable<ApiResponse<HistorialSaldoRow[]>> {
    return this.http.get<ApiResponse<HistorialSaldoRow[]>>(
      `${this.baseUrl}/${empleadoId}/historial-saldo`
    );
  }

  /**
   * Trazabilidad Visual (V012_55) — historial de goces (INDECI_VACACIONES) de un empleado, con
   * quién y cuándo registró cada uno. Alimenta la pestaña "Goces Directos" del modal Historial.
   */
  listarGoces(empleadoId: number): Observable<ApiResponse<GoceRegistrado[]>> {
    return this.http.get<ApiResponse<GoceRegistrado[]>>(
      `${this.baseUrl}/${empleadoId}/goces`
    );
  }
}
