import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { extractApiData } from '../../../core/http/map-api-response';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { Cargo } from '../models/cargo.model';

@Injectable({ providedIn: 'root' })
export class CargoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/catalogos';

  /** Lista todos los cargos activos ordenados por nombre. */
  listarCargos(): Observable<readonly Cargo[]> {
    return this.http
      .get<ApiResponse<Cargo[]>>(`${this.base}/cargos`)
      .pipe(map(extractApiData));
  }
}
