import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, switchMap } from 'rxjs';

import { LegajoApiService } from './legajo-api';
import { CategoriaLegajo, LegajoDocumento } from '../models/legajo.model';

export type LegajoDocumentoOrigen =
  | 'FORMACION_ACADEMICA'
  | 'CAPACITACION'
  | 'IDIOMA'
  | 'CONOCIMIENTO_INFORMATICO'
  | 'EXPERIENCIA_LABORAL'
  | 'RECONOCIMIENTO'
  | 'MEDIDA_DISCIPLINARIA'
  | 'DOCUMENTO_COMPLEMENTARIO';

export interface SubirSustentoRequest {
  empleadoId: number;
  origen: LegajoDocumentoOrigen;
  nombreDocumento: string;
  fechaDocumento?: string | null;
  observacion?: string | null;
  referenciaId?: number | null;
  subcategoriaId?: number | null;
  file: File;
}

@Injectable({
  providedIn: 'root',
})
export class LegajoDocumentoService {
  private readonly api = inject(LegajoApiService);

  private categoriasCache$?: Observable<CategoriaLegajo[]>;

  subirSustento(request: SubirSustentoRequest): Observable<LegajoDocumento> {
    return this.obtenerCategoriaIdPorOrigen(request.origen).pipe(
      switchMap((categoriaId) =>
        this.api.subirDocumentoLegajo({
          empleadoId: request.empleadoId,
          categoriaId,
          subcategoriaId: request.subcategoriaId ?? null,
          nombreDocumento: request.nombreDocumento,
          fechaDocumento: request.fechaDocumento ?? null,
          observacion: request.observacion ?? null,
          origen: request.origen,
          referenciaId: request.referenciaId ?? null,
          file: request.file,
        }),
      ),
    );
  }

  private listarCategoriasCache(): Observable<CategoriaLegajo[]> {
    if (!this.categoriasCache$) {
      this.categoriasCache$ = this.api.listarCategoriasLegajo().pipe(shareReplay(1));
    }

    return this.categoriasCache$;
  }

  private obtenerCategoriaIdPorOrigen(origen: LegajoDocumentoOrigen): Observable<number> {
    return this.listarCategoriasCache().pipe(
      map((categorias) => {
        const nombreCategoria = this.nombreCategoriaPorOrigen(origen);

        const categoria = categorias.find((item) => {
          return this.normalizar(item.nombre ?? '') === this.normalizar(nombreCategoria);
        });

        const categoriaId = this.obtenerIdCategoria(categoria);

        if (!categoriaId) {
          const disponibles = categorias
            .map((c) => `${this.obtenerIdCategoria(c) ?? '-'} - ${c.nombre ?? '-'}`)
            .join(', ');

          throw new Error(
            `No se encontró la categoría "${nombreCategoria}". Categorías disponibles: ${disponibles}`,
          );
        }

        return categoriaId;
      }),
    );
  }

  private nombreCategoriaPorOrigen(origen: LegajoDocumentoOrigen): string {
    switch (origen) {
      case 'FORMACION_ACADEMICA':
        return 'Formación Académica';

      case 'CAPACITACION':
        return 'Capacitación';

      case 'EXPERIENCIA_LABORAL':
        return 'Trayectoria Laboral';

      case 'RECONOCIMIENTO':
        return 'Reconocimientos';

      case 'MEDIDA_DISCIPLINARIA':
        return 'Medidas Disciplinarias';

      case 'IDIOMA':
      case 'CONOCIMIENTO_INFORMATICO':
      case 'DOCUMENTO_COMPLEMENTARIO':
        return 'Documentos Complementarios';
    }
  }

  private obtenerIdCategoria(categoria?: CategoriaLegajo): number | null {
    if (!categoria) {
      return null;
    }

    const id =
      categoria.id ?? categoria.categoriaId ?? categoria['ID'] ?? categoria['idCategoria'] ?? null;

    return id != null ? Number(id) : null;
  }

  private normalizar(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }
}
