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
] as const;
export type TipoDia = (typeof TIPOS_DIA)[number];

/** Día calendario — espejo de `AsistenciaDiaDto`. */
export interface AsistenciaDia {
  /** Fecha 'YYYY-MM-DD'. */
  dia: string;
  tipoDia: TipoDia;
  minutosTardanza: number;
  observacion: string | null;
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
  readonly estado: string;
  readonly observacion: string | null;
  readonly dias: readonly AsistenciaDia[];
}

/** Cuerpo POST — espejo de `AsistenciaGuardarDto`. */
export interface AsistenciaGuardarInput {
  readonly empleadoId: number;
  readonly periodo: string;
  readonly remuneracionBase: number | null;
  readonly observacion: string | null;
  readonly estado?: string;
  readonly dias: readonly AsistenciaDia[];
}
