import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ResumenPlanilla } from '../models/resumen-planilla.model';
import type { GeneracionMasivaResultado } from '../models/generacion-masiva.model';

/**
 * Generador de planilla (Spec 009 / T151, Spec 011 / C2).
 * Backend: `GeneradorPlanillaController` → `/api/rrhh/generador-planilla`.
 *
 * Spec 011 / C2 (BKD-001): `generarMasivo` devuelve `{ total, exitosos, fallidos[] }`.
 */
@Injectable({ providedIn: 'root' })
export class GeneradorPlanillaApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/rrhh/generador-planilla';

  /** Generación individual: POST `/generador-planilla/{empleadoId}/{periodo}`. */
  generarIndividual(empleadoId: number, periodo: string): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/${empleadoId}/${periodo}`, null)
      .pipe(map(extractApiData));
  }

  /** Generación masiva: POST `/generador-planilla/masivo/{periodo}` → resultado con fallidos. */
  generarMasivo(periodo: string): Observable<GeneracionMasivaResultado> {
    return this.http
      .post<ApiResponse<GeneracionMasivaResultado>>(`${this.baseUrl}/masivo/${periodo}`, null)
      .pipe(map(extractApiData));
  }

  /** Resumen empleado: totales ingresos / descuentos / neto. */
  obtenerResumen(empleadoId: number, periodo: string): Observable<ResumenPlanilla> {
    return this.http
      .get<ApiResponse<ResumenPlanilla>>(`${this.baseUrl}/resumen/${empleadoId}/${periodo}`)
      .pipe(map(extractApiData));
  }
}
