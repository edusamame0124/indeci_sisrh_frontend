import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  CatalogoConceptoMgrhFiltro,
  CatalogoConceptoMgrhPage,
} from '../models/catalogo-mgrh.model';

/**
 * Consulta paginada del catÃ¡logo Ãºnico de conceptos MGRH / MEF
 * (SPEC_HOMOLOGACION_MGRH Â§E Â· Â§D4). Solo lectura (PLA_READ).
 *
 * Backend: `GET /api/rrhh/catalogo-mgrh` â†’ `ApiResponse<Page<CatalogoConceptoMgrhDto>>`.
 * Reutilizable: la pestaÃ±a de homologaciÃ³n del wizard la consume server-side.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoMgrhApiService {
  private readonly http = inject(HttpClient);

  /**
   * Busca conceptos del catÃ¡logo MGRH con filtros parciales (case-insensitive en
   * backend) y paginaciÃ³n Spring. Los filtros vacÃ­os no se envÃ­an; el backend
   * asume `soloSeleccionables=true` y `soloVigentes=true` si no se especifican.
   */
  buscar(
    filtros: CatalogoConceptoMgrhFiltro,
    page: number,
    size: number,
  ): Observable<CatalogoConceptoMgrhPage> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    params = this.appendTexto(params, 'texto', filtros.texto);
    params = this.appendTexto(params, 'tipoLocal', filtros.tipoLocal);
    params = this.appendTexto(params, 'codigo', filtros.codigo);
    params = this.appendTexto(params, 'tipo', filtros.tipo);
    params = this.appendTexto(params, 'descripcion', filtros.descripcion);
    params = this.appendTexto(params, 'detalle', filtros.detalle);
    params = this.appendTexto(params, 'estado', filtros.estado);

    if (filtros.soloActivos !== undefined) {
      params = params.set('soloActivos', String(filtros.soloActivos));
    }
    if (filtros.limit !== undefined) {
      params = params.set('limit', String(filtros.limit));
    }

    if (filtros.soloSeleccionables !== undefined) {
      params = params.set('soloSeleccionables', String(filtros.soloSeleccionables));
    }
    if (filtros.soloVigentes !== undefined) {
      params = params.set('soloVigentes', String(filtros.soloVigentes));
    }

    return this.http
      .get<ApiResponse<CatalogoConceptoMgrhPage>>('/api/rrhh/catalogo-mgrh', { params })
      .pipe(map(extractApiData));
  }

  private appendTexto(
    params: HttpParams,
    key: string,
    value: string | null | undefined,
  ): HttpParams {
    const v = (value ?? '').trim();
    return v.length ? params.set(key, v) : params;
  }
}
