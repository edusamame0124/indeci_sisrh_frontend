export interface ConceptoBoletaDto {
  readonly codigo: string;
  readonly concepto: string;
  readonly monto: number;
  readonly observacion?: string;
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
}
