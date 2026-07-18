/**
 * Tipos espejo de los DTOs del backend para el Import de Vinculación
 * (com.indeci.rrhh.vinculacion.importacion.VinculacionImportDtos).
 *
 * El import de dos fases: `preview` valida sin escribir; `commit` persiste solo las
 * filas sin errores. Estos tipos describen lo que devuelve cada fase.
 */

/** Severidad de un hallazgo sobre una celda/fila. */
export type ImportSeveridad = 'SANEADO' | 'ADVERTENCIA' | 'ERROR';

/** Estado global de una fila en la previsualización. */
export type ImportEstadoFila = 'OK' | 'ADVERTENCIA' | 'ERROR';

/** Un hallazgo, anclado a la celda exacta para que RR.HH. sepa qué corregir. */
export interface ImportIssue {
  /** Referencia Excel de la celda, p. ej. "BF375". */
  readonly celda: string;
  /** Cabecera legible de la columna. */
  readonly columna: string;
  readonly severidad: ImportSeveridad;
  readonly mensaje: string;
}

/** Estado de una fila del Excel tras validar. */
export interface ImportFilaPreview {
  readonly numeroFila: number;
  readonly dni: string;
  readonly nombre: string;
  readonly estado: ImportEstadoFila;
  readonly issues: readonly ImportIssue[];
}

/** Resultado de la previsualización — no se escribió nada en la base. */
export interface ImportPreview {
  readonly total: number;
  readonly importables: number;
  readonly conError: number;
  readonly conAdvertencia: number;
  readonly filas: readonly ImportFilaPreview[];
}

/** Resultado de la importación efectiva. */
export interface ImportCommit {
  readonly total: number;
  readonly creados: number;
  readonly actualizados: number;
  readonly omitidos: number;
  readonly errores: readonly ImportFilaPreview[];
}
