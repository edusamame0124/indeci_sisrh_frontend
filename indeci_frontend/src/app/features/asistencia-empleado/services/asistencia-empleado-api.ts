import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MiAsistenciaEmpleado } from '../models/asistencia-empleado.model';

@Injectable({
  providedIn: 'root',
})
export class AsistenciaEmpleadoApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarMisAsistencias(
    fechaInicio: string,
    fechaFin: string,
  ): Observable<MiAsistenciaEmpleado[]> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    return this.http
      .get<any>(`${this.apiUrl}/rrhh/asistencia/mis-asistencias`, { params })
      .pipe(map((resp) => this.extraerLista(resp)));
  }

  private extraerLista(resp: any): MiAsistenciaEmpleado[] {
    const data = resp?.data ?? resp;

    // Caso 1: backend devuelve directamente una lista
    if (Array.isArray(data)) {
      return data;
    }

    // Caso 2: backend devuelve ApiResponse con data.content
    if (Array.isArray(data?.content)) {
      return data.content;
    }

    // Caso 3: backend devuelve Page directamente
    if (Array.isArray(resp?.content)) {
      return resp.content;
    }

    console.warn('Respuesta inesperada de mis-asistencias:', resp);
    return [];
  }
}