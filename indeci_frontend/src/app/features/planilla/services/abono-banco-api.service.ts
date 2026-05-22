import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ResumenBancoRow } from '../models/abono-banco.model';

/**
 * Abonos bancarios M14 (SPEC §12.2 PANTALLA-07).
 * Backend: `AbonoBancoController` → `/api/rrhh/abono-banco`.
 */
@Injectable({ providedIn: 'root' })
export class AbonoBancoApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/abono-banco';

  /** Genera (UPSERT) los abonos de todos los movimientos del período. */
  generarAbonos(periodo: string): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/generar/${periodo}`, null)
      .pipe(map(extractApiData));
  }

  /** Resumen de abonos del período agrupado por banco. */
  resumenPorBanco(periodo: string): Observable<readonly ResumenBancoRow[]> {
    return this.http
      .get<ApiResponse<ResumenBancoRow[]>>(`${this.baseUrl}/resumen-banco/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Registra el ticket MCPP de un abono (lo pasa a PROCESADO). */
  registrarTicket(id: number, nroTicketMcpp: string): Observable<null> {
    return this.http
      .put<ApiResponse<null>>(`${this.baseUrl}/${id}/ticket`, { nroTicketMcpp })
      .pipe(map(extractApiData));
  }

  /** Aplica un mismo ticket MCPP a varios abonos a la vez. */
  registrarTicketMasivo(abonoIds: readonly number[], nroTicketMcpp: string): Observable<number> {
    return this.http
      .put<ApiResponse<number>>(`${this.baseUrl}/ticket-masivo`, { abonoIds, nroTicketMcpp })
      .pipe(map(extractApiData));
  }

  /**
   * Spec 013 / C1 · P-07 — Descarga el ZIP con un .txt de abonos por banco.
   * Backend: `ArchivoBancoController` → `/api/rrhh/archivo-banco`.
   */
  descargarArchivoZip(periodo: string): Observable<Blob> {
    return this.http.get(`/api/rrhh/archivo-banco/${periodo}/zip`, {
      responseType: 'blob',
    });
  }
}
