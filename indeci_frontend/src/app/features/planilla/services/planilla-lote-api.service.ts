import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { PlanillaLoteDashboardRow } from '../models/planilla-lote.model';

export interface CandidatoAdicionalDto {
  empleadoId: number;
  dni: string;
  nombre: string;
  regimenLaboral: string;
  fechaIngreso: string;
  motivo: string;
}

export interface GenerarAdicionalRequestDto {
  empleadosIds: number[];
}

@Injectable({
  providedIn: 'root',
})
export class PlanillaLoteApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rrhh/planillas-lote`;

  obtenerCandidatosAdicionales(periodo: string): Observable<CandidatoAdicionalDto[]> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .get<ApiResponse<CandidatoAdicionalDto[]>>(`${this.baseUrl}/candidatos-adicional`, { params })
      .pipe(map((res) => res.data));
  }

  generarLoteAdicional(periodo: string, request: GenerarAdicionalRequestDto): Observable<void> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/generar-adicional`, request, { params })
      .pipe(map(() => void 0));
  }

  obtenerLotesDashboard(periodo: string, regimen?: string): Observable<readonly PlanillaLoteDashboardRow[]> {
    let params = new HttpParams().set('periodo', periodo);
    if (regimen) {
      params = params.set('regimen', regimen);
    }
    
    return this.http
      .get<ApiResponse<readonly PlanillaLoteDashboardRow[]>>(`${this.baseUrl}/lotes`, { params })
      .pipe(map((res) => res.data));
  }
}
