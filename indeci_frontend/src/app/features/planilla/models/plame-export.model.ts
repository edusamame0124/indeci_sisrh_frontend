/**
 * B3 / M09 — Exportación PLAME / PDT 601 (archivos .rem, .jor, .snl).
 * Los tipos de preview son espejo del futuro `PlameExportResponseDto` (B3-6).
 */

/** Archivos descargables del PLAME. */
export type PlameArchivo = 'rem' | 'jor' | 'snl';

/** Resumen previo a la descarga (conteos + totales del período). */
export interface PlamePreview {
  /** "YYYY-MM". */
  readonly periodo: string;
  readonly remLineas: number;
  readonly jorLineas: number;
  readonly snlLineas: number;
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
}
