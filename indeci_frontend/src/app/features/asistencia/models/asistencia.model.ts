/**
 * Módulo M04 — Asistencia (SPEC §12.2 PANTALLA-02).
 * Espejo de los DTOs Java `Asistencia*Dto`.
 */

/** Tipos de día del calendario (espejo del CHECK INDECI_ASIST_DET_TIPO_CK). */
export const TIPOS_DIA = [
  'LABORAL',
  'TARDANZA',
  'FALTA',
  'LICENCIA',
  'VACACIONES',
  'DESCANSO',
  'FERIADO',
  'OBSERVADO',
  'SANCION_PAD',
  // Regla SERVIR/INDECI "Omisión de marcación": entrada XOR salida.
  'OMISION_MARCACION',
  // Omisión cubierta por papeleta 004 aprobada (tiempo completo).
  'ASISTENCIA_JUSTIFICADA',
] as const;
export type TipoDia = (typeof TIPOS_DIA)[number];

/**
 * Tipos seleccionables por click directo en la celda del calendario (ciclo).
 * Se excluyen los derivados por el sistema (SANCION_PAD exige motivo; OMISION_MARCACION
 * y ASISTENCIA_JUSTIFICADA los deriva la carga/cruce de papeletas, no se marcan a mano).
 */
// Tipo anotado como TipoDia[] a propósito: TS 5.5+ infiere un predicado que estrecharía el
// element type y rompería usos como TIPOS_DIA_CICLABLES.indexOf(tipoDiaCompleto).
export const TIPOS_DIA_CICLABLES: readonly TipoDia[] = TIPOS_DIA.filter(
  (t) => t !== 'SANCION_PAD' && t !== 'OMISION_MARCACION' && t !== 'ASISTENCIA_JUSTIFICADA',
);

export const ESTADOS_ASISTENCIA = [
  'BORRADOR',
  'PREVALIDADA',
  'LISTA_PARA_VALIDAR',
  'OBSERVADA',
  'VALIDADA',
] as const;
export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];

/** Día calendario — espejo de `AsistenciaDiaDto`. */
export interface AsistenciaDia {
  /** Fecha 'YYYY-MM-DD'. */
  dia: string;
  tipoDia: TipoDia;
  minutosTardanza: number;
  observacion: string | null;
  diaSemana?: string | null;
  marcaEntrada?: string | null;
  marcaSalida?: string | null;
  horaEntradaEsperada?: string | null;
  minutosSalidaAnticipada?: number | null;
  horasTrabajadasMin?: number | null;
  horasExtra25Min?: number | null;
  horasExtra35Min?: number | null;
  horasExtra100Min?: number | null;
  horasExtraTotalMin?: number | null;
  origen?: 'MANUAL' | 'IMPORT_MARCADOR' | null;
}

/** Respuesta GET — espejo de `AsistenciaResponseDto`. */
export interface AsistenciaResponse {
  readonly id: number | null;
  readonly empleadoId: number;
  readonly periodo: string;
  readonly remuneracionBase: number | null;
  readonly diasLaborados: number;
  readonly diasFalta: number;
  readonly totalMinTardanza: number;
  readonly descuentoTardanza: number;
  readonly descuentoFalta: number;
  // V010_95 — modelo de dos niveles (Descuento 1 / Descuento 2).
  readonly minTardanzaDiaria?: number | null;
  readonly minTardanzaMenorAcum?: number | null;
  readonly minTardanzaExcesoMes?: number | null;
  readonly descuentoTardanzaDiaria?: number | null;
  readonly descuentoTardanzaMensual?: number | null;
  /** Umbral diario vigente del régimen (clasifica cada día en la UI). */
  readonly umbralTardanzaDiariaMin?: number | null;
  readonly estado: EstadoAsistencia;
  readonly observacion: string | null;
  readonly dias: readonly AsistenciaDia[];
}

/** Cuerpo POST — espejo de `AsistenciaGuardarDto`. */
export interface AsistenciaGuardarInput {
  readonly empleadoId: number;
  readonly periodo: string;
  readonly remuneracionBase: number | null;
  readonly observacion: string | null;
  readonly estado?: EstadoAsistencia;
  readonly dias: readonly AsistenciaDia[];
}
