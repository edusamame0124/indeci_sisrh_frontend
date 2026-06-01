/**
 * F3.6 — Modelos TS del módulo Legajo Documental (espejo backend F2.6).
 *
 * Cubre: categorías y subcategorías del legajo + metadata del documento
 * persistida en {@code INDECI_LEGAJO_DOCUMENTO}. El binario vive en el FTP
 * institucional (no se transporta por estos modelos).
 */

export interface LegajoCategoria {
  readonly id: number;
  readonly nombre: string;
  readonly ordenVisual: number;
  readonly activo: number;
}

export interface LegajoSubcategoria {
  readonly id: number;
  readonly categoriaId: number;
  readonly nombre: string;
  readonly ordenVisual: number;
  readonly activo: number;
}

/** Response con denormalización de nombres de categoría/subcategoría. */
export interface LegajoDocumentoResponse {
  readonly id: number;
  readonly empleadoId: number;
  readonly categoriaId: number;
  readonly categoriaNombre: string | null;
  readonly subcategoriaId: number | null;
  readonly subcategoriaNombre: string | null;
  readonly nombreDocumento: string;
  readonly nombreArchivo: string | null;
  /** Ruta FTP (uso interno; UI no la expone directo). */
  readonly rutaArchivo: string | null;
  readonly extension: string | null;
  readonly pesoArchivo: number | null;
  readonly fechaDocumento: string | null;
  readonly observacion: string | null;
  readonly origen: string | null;
  readonly referenciaId: number | null;
  readonly versionDoc: number;
  readonly createdAt: string;
  readonly createdBy: string | null;
}
