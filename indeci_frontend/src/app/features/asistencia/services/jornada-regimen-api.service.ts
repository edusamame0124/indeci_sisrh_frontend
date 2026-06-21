import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { JornadaRegimen, JornadaRegimenInput } from '../models/jornada-regimen.model';

/** Configuración de jornada por régimen — backend `JornadaRegimenController`. */
@Injectable({ providedIn: 'root' })
export class JornadaRegimenApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/parametros/jornada';

  /** Lista todas las jornadas configuradas (una por régimen). */
  listar(): Observable<readonly JornadaRegimen[]> {
    return this.http
      .get<ApiResponse<readonly JornadaRegimen[]>>(this.baseUrl)
      .pipe(map(extractApiData));
  }

  obtener(regimenLaboralId: number): Observable<JornadaRegimen> {
    return this.http
      .get<ApiResponse<JornadaRegimen>>(`${this.baseUrl}/${regimenLaboralId}`)
      .pipe(map(extractApiData));
  }

  guardar(input: JornadaRegimenInput): Observable<JornadaRegimen> {
    return this.http
      .post<ApiResponse<JornadaRegimen>>(this.baseUrl, input)
      .pipe(map(extractApiData));
  }

  /** Elimina la configuración de jornada del régimen. */
  eliminar(regimenLaboralId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${regimenLaboralId}`)
      .pipe(map(() => undefined));
  }
}
