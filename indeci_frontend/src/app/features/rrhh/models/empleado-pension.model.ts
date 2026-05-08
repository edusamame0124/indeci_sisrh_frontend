/** Mirrors `EmpleadoPensionDto`. */
export interface EmpleadoPensionInput {
  empleadoId: number;
  afpId: number | null;
  tipo: PensionTipo;
  cuspp: string;
  porcentajeAporte: number | null;
  porcentajeComision: number | null;
  porcentajeSeguro: number | null;
}

export type PensionTipo = 'AFP' | 'ONP';

/** Mirrors `EmpleadoPensionResponseDto`. */
export interface EmpleadoPensionRow {
  readonly id: number;
  readonly afpId: number | null;
  readonly tipo: string;
  readonly cuspp: string;
  readonly porcentajeAporte: number | null;
  readonly activo: number;
}
