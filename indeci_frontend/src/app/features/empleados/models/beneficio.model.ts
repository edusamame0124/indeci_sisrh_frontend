/**
 * Préstamos y saldo de vacaciones del empleado (Spec 011 / B5 — mantenimiento).
 * Espejo de los DTOs Java `Prestamo*Dto` / `VacacionSaldo*Dto`.
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

/** Fila de saldo de vacaciones — espejo de `VacacionSaldoResponseDto`. */
export interface VacacionSaldoRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly anio: number;
  readonly diasGanados: number;
  readonly diasGozados: number;
  readonly diasSaldo: number;
  readonly observacion: string | null;
}

/** Cuerpo POST de saldo de vacaciones (UPSERT por año) — espejo de `VacacionSaldoDto`. */
export interface VacacionSaldoInput {
  readonly empleadoId: number;
  readonly anio: number;
  readonly diasGanados: number;
  readonly diasGozados: number;
  readonly observacion: string | null;
}
