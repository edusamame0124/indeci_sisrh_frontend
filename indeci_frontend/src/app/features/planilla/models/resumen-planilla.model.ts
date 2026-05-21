/** Mirrors `ResumenPlanillaDto` (Java). */
export interface ResumenPlanilla {
  readonly empleadoId: number;
  readonly periodo: string;
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
  readonly netoPagar: number;
  /** Spec 010 §5.4 / SERVIR-07 — umbral mínimo del neto. */
  readonly neto50pctMinimo: number | null;
  /** 'BIEN' | 'NETO_NO_VA' — semáforo de validación neto 50%. */
  readonly estadoNeto: string | null;
}
