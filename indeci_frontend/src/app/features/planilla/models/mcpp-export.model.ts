/**
 * B3 / M14 — Exportación MCPP Web (archivos PLL*.TXT).
 * Espejo del futuro `McppExportResponseDto` (B3-6).
 */

/** Tipo de planilla MCPP: 01 SERVIR, 03 CAS, 12 Judiciales. */
export type McppTipoPlanilla = '01' | '03' | '12';

/** Planilla disponible para exportar en un período. */
export interface McppPlanillaDisponible {
  readonly tipoPlanilla: McppTipoPlanilla;
  readonly nroPlanilla: number;
  readonly totalRegistros: number;
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
}
