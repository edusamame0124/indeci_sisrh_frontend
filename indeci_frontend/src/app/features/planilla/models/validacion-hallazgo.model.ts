/** Severidad de un hallazgo del Centro de Validaciones (F3.3). */
export type ValidacionSeveridad = 'BLOQUEO' | 'ALERTA' | 'INFO';

/**
 * Módulo al que pertenece un hallazgo. La UI lo usa para filtrar y para
 * decidir el destino del CTA "Ir al módulo".
 */
export type ValidacionModulo =
  | 'Período'
  | 'Asistencia'
  | 'Empleado'
  | 'Concepto'
  | 'Evento';

/** Mirrors `ValidacionHallazgoDto` (Java). */
export interface ValidacionHallazgoRow {
  readonly codigo: string;
  readonly severidad: ValidacionSeveridad;
  readonly modulo: ValidacionModulo | string;
  readonly mensaje: string;
  readonly empleadoId: number | null;
  readonly empleadoNombre: string | null;
  readonly referenciaId: number | null;
}

/** Mirrors `PreflightValidacionDto` (Java). */
export interface PreflightValidacionResponse {
  readonly periodo: string;
  readonly totalBloqueos: number;
  readonly totalAlertas: number;
  readonly totalInfo: number;
  readonly hallazgos: readonly ValidacionHallazgoRow[];
}
