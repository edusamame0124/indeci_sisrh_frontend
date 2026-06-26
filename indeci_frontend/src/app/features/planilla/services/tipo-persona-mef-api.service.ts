import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../../core/models/api-response.model';
import { TipoPersonaMef } from '../models/tipo-persona-mef.model';

@Injectable({
  providedIn: 'root',
})
export class TipoPersonaMefApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/rrhh/tipo-persona-mef';

  listarActivos(): Observable<TipoPersonaMef[]> {
    return this.http
      .get<ApiResponse<TipoPersonaMef[]>>(this.endpoint)
      .pipe(map((res) => res.data));
  }
}
