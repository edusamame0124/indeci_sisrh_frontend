import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmpleadoOtrosIngresosDto, LiquidacionQuintaDto } from '../models/quinta-categoria.models';
@Injectable({
  providedIn: 'root'
})
export class QuintaCategoriaApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/rrhh/quinta-categoria/otros-ingresos`;

  obtenerOtrosIngresos(empleadoId: number, anioFiscal: number): Observable<EmpleadoOtrosIngresosDto> {
    const params = new HttpParams()
      .set('empleadoId', empleadoId.toString())
      .set('anioFiscal', anioFiscal.toString());
    
    return this.http.get<EmpleadoOtrosIngresosDto>(this.apiUrl, { params });
  }

  guardarOtrosIngresos(dto: EmpleadoOtrosIngresosDto): Observable<EmpleadoOtrosIngresosDto> {
    return this.http.post<EmpleadoOtrosIngresosDto>(this.apiUrl, dto);
  }

  obtenerLiquidacionQuinta(empleadoId: number, anioFiscal: number, mesFiscal: number): Observable<LiquidacionQuintaDto> {
    const params = new HttpParams()
      .set('empleadoId', empleadoId.toString())
      .set('anioFiscal', anioFiscal.toString())
      .set('mesFiscal', mesFiscal.toString());
    
    return this.http.get<LiquidacionQuintaDto>(`${environment.apiUrl}/rrhh/quinta-categoria/liquidacion`, { params });
  }
}
