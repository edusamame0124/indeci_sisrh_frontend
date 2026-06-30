import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BoletaPagoResponseDto } from '../models/boleta.model';

@Injectable({
  providedIn: 'root',
})
export class BoletaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/boleta';

  /** FASE 4 - Descarga los datos de la boleta para ser renderizados en UI. */
  obtenerBoletaData(empleadoId: number, periodo: string): Observable<BoletaPagoResponseDto> {
    return this.http.get<BoletaPagoResponseDto>(`${this.baseUrl}/${empleadoId}/${periodo}/data`);
  }
}
