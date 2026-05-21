/** Mirrors `EmpleadoBancoDto`. */
export interface EmpleadoBancoInput {
  empleadoId: number;
  bankId: number;
  accountTypeId: number;
  numeroCuenta: string;
  cci: string;
  esCuentaPlanilla: number;
}

/** Mirrors `EmpleadoBancoResponseDto` (denormalizado en Spec 009 — incluye `bank`/`accountType` + `accountTypeId`). */
export interface EmpleadoBancoRow {
  readonly id: number;
  readonly bankId: number;
  readonly accountTypeId: number;
  readonly numeroCuenta: string;
  readonly cci: string;
  readonly esCuentaPlanilla: number;
  readonly activo: number;
  // ===== Spec 009 / T136 — display names denormalizados =====
  readonly bank: string;
  readonly accountType: string;
}
