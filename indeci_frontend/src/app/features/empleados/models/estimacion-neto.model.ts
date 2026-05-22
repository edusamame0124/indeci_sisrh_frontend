/** Mirrors `EstimacionNetoRequestDto` (Java). */
export interface EstimacionNetoInput {
  conceptoId: number;
  monto: number;
}

/**
 * Mirrors `EstimacionNetoDto` (Java).
 * Jackson serializa los `BigDecimal` como número JSON → `number` en TS.
 */
export interface EstimacionNetoResult {
  readonly netoActual: number;
  readonly netoEstimado: number;
  readonly diferencia: number;
  readonly cumpleRegla50: boolean;
  readonly mensajeAlerta: string | null;
}
