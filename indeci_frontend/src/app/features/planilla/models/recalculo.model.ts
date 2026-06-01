/**
 * F3.4 — Modelos del Asistente de Recálculo.
 *
 * Espejo de los records Java:
 * {@code RecalculoCriterioDto}, {@code RecalculoPreviewDto},
 * {@code RecalculoResultadoDto}.
 */

export type RecalculoCriterioTipo =
  | 'TODOS'
  | 'REGIMEN_LABORAL'
  | 'EMPLEADOS_LISTA'
  | 'CON_PREFLIGHT_PENDIENTE';

export interface RecalculoCriterioRequest {
  readonly tipo: RecalculoCriterioTipo;
  readonly valorString: string | null;
  readonly valorListaIds: readonly number[] | null;
}

export interface RecalculoPreviewItem {
  readonly empleadoId: number;
  readonly nombreCompleto: string | null;
  readonly regimenLaboralCodigo: string | null;
  readonly netoActual: number;
  readonly tieneMovimientoPrevio: boolean;
}

export interface RecalculoPreviewResponse {
  readonly periodo: string;
  readonly criterioTipo: RecalculoCriterioTipo;
  readonly total: number;
  readonly items: readonly RecalculoPreviewItem[];
}

export type RecalculoStatus = 'OK' | 'ERROR';

export interface RecalculoResultadoItem {
  readonly empleadoId: number;
  readonly nombreCompleto: string | null;
  readonly status: RecalculoStatus;
  readonly netoAnterior: number;
  readonly netoNuevo: number | null;
  readonly delta: number | null;
  readonly razon: string | null;
}

export interface RecalculoResultadoResponse {
  readonly periodo: string;
  readonly total: number;
  readonly exitosos: number;
  readonly fallidos: number;
  readonly totalDelta: number;
  readonly items: readonly RecalculoResultadoItem[];
}
