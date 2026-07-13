/**
 * Préstamos del empleado (Spec 011 / B5 — mantenimiento).
 * Espejo de los DTOs Java `Prestamo*Dto`.
 */

/** Fila de préstamo — espejo de `PrestamoResponseDto`. */
export interface PrestamoRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly descripcion: string;
  readonly montoTotal: number;
  readonly numeroCuotas: number;
  readonly cuotaMensual: number;
  readonly cuotasPagadas: number;
  readonly saldoPendiente: number;
  /** ACTIVO | CANCELADO. */
  readonly estado: string;
  readonly fechaInicio: string | null;
}

/** Cuerpo POST de préstamo — espejo de `PrestamoDto`. */
export interface PrestamoInput {
  readonly empleadoId: number;
  readonly descripcion: string;
  readonly montoTotal: number;
  readonly numeroCuotas: number;
  readonly cuotaMensual: number;
}
