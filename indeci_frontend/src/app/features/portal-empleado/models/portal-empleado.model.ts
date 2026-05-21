/**
 * Modelos del Portal del Empleado (SPEC §12.2 PANTALLA-08).
 * Espejo de los DTOs Java `PrestamoResponseDto` / `VacacionSaldoResponseDto`.
 */

/** Préstamo del empleado — espejo de `PrestamoResponseDto`. */
export interface PrestamoRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly descripcion: string;
  readonly montoTotal: number;
  readonly numeroCuotas: number;
  readonly cuotaMensual: number;
  readonly cuotasPagadas: number;
  /** Saldo pendiente derivado por el backend. */
  readonly saldoPendiente: number;
  /** ACTIVO | CANCELADO. */
  readonly estado: string;
  readonly fechaInicio: string | null;
}

/** Saldo de vacaciones de un año — espejo de `VacacionSaldoResponseDto`. */
export interface VacacionSaldoRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly anio: number;
  readonly diasGanados: number;
  readonly diasGozados: number;
  /** Saldo de días derivado por el backend. */
  readonly diasSaldo: number;
  readonly observacion: string | null;
}
