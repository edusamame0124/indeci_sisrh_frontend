import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  LegajoCategoria,
  LegajoDocumentoResponse,
  LegajoSubcategoria,
} from '../models/legajo-documento.model';

/** F3.6 — Parámetros opcionales del upload (van como query params al endpoint). */
export interface LegajoUploadOptions {
  readonly subcategoriaId?: number | null;
  readonly nombreDocumento?: string | null;
  /** Fecha del documento en formato ISO yyyy-MM-dd. */
  readonly fechaDocumento?: string | null;
  readonly observacion?: string | null;
  /** "EVENTO" | "ASISTENCIA" | "MANUAL" | "IMPORTACION". */
  readonly origen?: string | null;
  readonly referenciaId?: number | null;
}

/**
 * F3.6 — Cliente del legajo documental.
 * Backend: {@code LegajoDocumentoController} → `/api/rrhh/legajo`.
 */
@Injectable({ providedIn: 'root' })
export class LegajoDocumentoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/rrhh/legajo';

  /** Categorías activas, ordenadas visualmente. */
  listarCategorias(): Observable<readonly LegajoCategoria[]> {
    return this.http
      .get<ApiResponse<LegajoCategoria[]>>(`${this.baseUrl}/categorias`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarSubcategorias(
    categoriaId: number,
  ): Observable<readonly LegajoSubcategoria[]> {
    return this.http
      .get<ApiResponse<LegajoSubcategoria[]>>(
        `${this.baseUrl}/categorias/${categoriaId}/subcategorias`,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  /** Documentos del empleado, más recientes primero. */
  listarPorEmpleado(
    empleadoId: number,
  ): Observable<readonly LegajoDocumentoResponse[]> {
    return this.http
      .get<ApiResponse<LegajoDocumentoResponse[]>>(
        `${this.baseUrl}/empleado/${empleadoId}`,
      )
      .pipe(map((r) => [...extractApiData(r)]));
  }

  obtener(id: number): Observable<LegajoDocumentoResponse> {
    return this.http
      .get<ApiResponse<LegajoDocumentoResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }

  /**
   * Sube un archivo al FTP institucional y registra metadata.
   * Devuelve el {@code id} del documento, que otros módulos enlazan como
   * {@code sustentoLegajoDocId}.
   *
   * <p>El backend recibe `multipart/form-data` con la parte `file` y los
   * campos descriptivos como query params.</p>
   */
  upload(
    file: File,
    empleadoId: number,
    categoriaId: number,
    opts: LegajoUploadOptions = {},
  ): Observable<LegajoDocumentoResponse> {
    const params: Record<string, string> = {
      empleadoId: String(empleadoId),
      categoriaId: String(categoriaId),
    };
    if (opts.subcategoriaId != null) params['subcategoriaId'] = String(opts.subcategoriaId);
    if (opts.nombreDocumento) params['nombreDocumento'] = opts.nombreDocumento;
    if (opts.fechaDocumento) params['fechaDocumento'] = opts.fechaDocumento;
    if (opts.observacion) params['observacion'] = opts.observacion;
    if (opts.origen) params['origen'] = opts.origen;
    if (opts.referenciaId != null) params['referenciaId'] = String(opts.referenciaId);

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<LegajoDocumentoResponse>>(`${this.baseUrl}/upload`, formData, {
        params,
      })
      .pipe(map(extractApiData));
  }

  eliminar(id: number): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(extractApiData));
  }
}
