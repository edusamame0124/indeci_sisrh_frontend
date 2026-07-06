import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';

/** Motivos normativos de reintegro/devengado (Modelo B). Contrato cerrado con el backend. */
export type MotivoReintegro =
  | 'DEVENGADO_JUDICIAL'
  | 'REPOSICION'
  | 'RETROACTIVO'
  | 'DIFERENCIA_REMUNERATIVA';

export interface RegistrarReintegroDto {
  empleadoId: number;
  periodoDestino: string;
  monto: number;
  motivo: MotivoReintegro;
  /** N° de Resolución / Mandato Judicial — obligatorio para trazabilidad de auditoría. */
  sustento: string;
  periodoOrigen?: string | null;
  movimientoOrigenId?: number | null;
  conceptoOrigenCodigo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReintegroMontoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rrhh/reintegros`;

  registrar(dto: RegistrarReintegroDto): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/registrar`, dto)
      .pipe(map(() => void 0));
  }
}
