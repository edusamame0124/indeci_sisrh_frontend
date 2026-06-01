/**
 * F5.2 — Modelos de Encargatura.
 *
 * Espejo de los DTOs Java {@code EncargaturaDto} y
 * {@code EncargaturaResponseDto}.
 */

export type EncargaturaEstado = 'ACTIVO' | 'CULMINADO';
export type EncargaturaFiltroEstado = EncargaturaEstado | 'TODOS';

/** Body POST/PUT. */
export interface EncargaturaRequest {
  empleadoTitularId: number;
  empleadoEncargId: number;
  /** ISO YYYY-MM-DD. */
  fechaInicio: string;
  /** ISO YYYY-MM-DD o null para encargatura indefinida. */
  fechaFin: string | null;
  resolucion: string | null;
}

/** Fila de la lista. */
export interface EncargaturaResponse {
  readonly id: number;
  readonly empleadoTitularId: number;
  readonly titularNombre: string | null;
  readonly titularDni: string | null;
  readonly empleadoEncargId: number;
  readonly encargadoNombre: string | null;
  readonly encargadoDni: string | null;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly resolucion: string | null;
  readonly estado: EncargaturaEstado;
}
