export interface ConceptoBoletaDto {
  readonly codigo: string;
  readonly concepto: string;
  readonly monto: number;
  readonly observacion?: string;
}

/** Track B — Sección AGUINALDO consolidada (opción A). null si el período no tiene aguinaldo. */
export interface AguinaldoSeccionDto {
  readonly titulo: string;
  readonly ingresos: readonly ConceptoBoletaDto[];
  readonly descuentos: readonly ConceptoBoletaDto[];
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
  readonly neto: number;
}

export interface BoletaPagoResponseDto {
  readonly periodo: string;
  readonly nombreCompleto: string;
  readonly dni: string;
  readonly regimenLaboral: string;
  readonly nivelRemunerativo: string;
  readonly cuentaBancaria: string;
  readonly modalidad: string;
  readonly diasLaborados: number;

  readonly ingresos: readonly ConceptoBoletaDto[];
  readonly descuentos: readonly ConceptoBoletaDto[];
  readonly aportes: readonly ConceptoBoletaDto[];

  readonly totalIngresos: number;
  readonly totalDescuentos: number;
  readonly netoPagar: number;

  // Track B — Consolidación (opción A): sección aguinaldo (null = sin aguinaldo) + neto total.
  readonly aguinaldo?: AguinaldoSeccionDto | null;
  readonly netoTotal?: number;
}
