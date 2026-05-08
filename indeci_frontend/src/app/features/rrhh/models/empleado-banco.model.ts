/** Mirrors `EmpleadoBancoDto`. */
export interface EmpleadoBancoInput {
  empleadoId: number;
  bankId: number;
  accountTypeId: number;
  numeroCuenta: string;
  cci: string;
  esCuentaPlanilla: number;
}

/** Mirrors `EmpleadoBancoResponseDto`. */
export interface EmpleadoBancoRow {
  readonly id: number;
  readonly bankId: number;
  readonly numeroCuenta: string;
  readonly cci: string;
  readonly esCuentaPlanilla: number;
  readonly activo: number;
}
