import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { AguinaldoRequest, AguinaldoResult } from '../models/aguinaldo.model';

/**
 * Track B — Aguinaldo (proceso aparte). Backend: `AguinaldoController`
 * → `POST /api/rrhh/aguinaldo/generar`.
 */
@Injectable({ providedIn: 'root' })
export class AguinaldoApiService {
  private readonly http = inject(HttpClient);

  generar(request: AguinaldoRequest): Observable<AguinaldoResult> {
    return this.http
      .post<ApiResponse<AguinaldoResult>>('/api/rrhh/aguinaldo/generar', request)
      .pipe(map(extractApiData));
  }
}
