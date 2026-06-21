export type CondicionEspecialAfp = 'NO_APLICA' | 'RETIRO_955' | 'PENSIONISTA_SPP';

/** Mirrors `EmpleadoPensionDto` (Java). */
export interface EmpleadoPensionInput {
  empleadoId: number;
  regimenPensionarioId: number;
  cuspp: string;
  porcentajeAporte: number | null;
  porcentajeComision: number | null;
  porcentajeSeguro: number | null;
  tipoComisionAfpId: number | null;
  tipoRegimen: string;
  condicionEspecialAfp: CondicionEspecialAfp | null;
  fechaCondicionAfp: string | null;
  documentoSustentoId: number | null;
  observacionCondicionAfp: string | null;
}

/** Mirrors `EmpleadoPensionResponseDto` (Java). */
export interface EmpleadoPensionRow {
  readonly id: number;
  readonly regimenPensionarioId: number;
  readonly cuspp: string;
  readonly porcentajeAporte: number | null;
  readonly porcentajeComision: number | null;
  readonly porcentajeSeguro: number | null;
  readonly tipoComisionAfpId: number | null;
  readonly tipoRegimen: string;
  readonly activo: number;
  readonly regimenPensionario: string;
  readonly tipoComisionAfp: string;
  readonly condicionEspecialAfp: CondicionEspecialAfp | null;
  readonly fechaCondicionAfp: string | null;
  readonly observacionCondicionAfp: string | null;
}

/**
 * Mirrors `TasasVigentesPensionDto` (Java).
 * Alimenta el autocomplete del modal "Registrar pensión" (Spec 013 / C1).
 * Las tasas vienen como fracción (0.1300 = 13%).
 */
export interface TasasVigentesPension {
  readonly tipoRegimen: 'ONP' | 'AFP' | string;
  readonly aporte: number | null;
  readonly comision: number | null;
  readonly prima: number | null;
  readonly comisionParametrizada: boolean;
}
