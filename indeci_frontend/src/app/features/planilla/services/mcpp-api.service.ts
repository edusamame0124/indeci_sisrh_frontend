import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  McppPlanillaDisponible,
  McppTipoPlanilla,
} from '../models/mcpp-export.model';

/**
 * B3 / M14 — Exportación MCPP Web (PLL*.TXT).
 * Backend: `McppController` → `/api/rrhh/mcpp` (endpoints B3-6, en construcción).
 */
@Injectable({ providedIn: 'root' })
export class McppApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/mcpp';

  /** Planillas disponibles para exportar en el período (por tipo). */
  listarPlanillas(periodo: string): Observable<readonly McppPlanillaDisponible[]> {
    return this.http
      .get<ApiResponse<McppPlanillaDisponible[]>>(`${this.baseUrl}/${periodo}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Descarga el PLL*.TXT de un tipo de planilla (01 SERVIR, 03 CAS, 12 Judiciales). */
  descargarTipo(periodo: string, tipo: McppTipoPlanilla): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${periodo}/${tipo}`, { responseType: 'blob' });
  }

  /** Descarga el ZIP con todos los tipos del período. */
  descargarZip(periodo: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${periodo}/zip`, { responseType: 'blob' });
  }
}
