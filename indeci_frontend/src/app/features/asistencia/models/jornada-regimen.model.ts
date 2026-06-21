/** Configuración de jornada y tolerancias por régimen (espeja JornadaRegimenDto). */
export interface JornadaRegimen {
  readonly id: number | null;
  readonly regimenLaboralId: number;
  readonly regimenCodigo: string | null;
  readonly regimenNombre: string | null;
  readonly horaIngreso: string | null;
  readonly horaSalida: string | null;
  readonly refrigerioInicio: string | null;
  readonly refrigerioFin: string | null;
  readonly toleranciaIngresoMin: number;
  readonly toleranciaAlmuerzoMin: number;
  readonly jornadaHoras: number;
}

export interface JornadaRegimenInput {
  readonly regimenLaboralId: number;
  readonly horaIngreso: string | null;
  readonly horaSalida: string | null;
  readonly refrigerioInicio: string | null;
  readonly refrigerioFin: string | null;
  readonly toleranciaIngresoMin: number;
  readonly toleranciaAlmuerzoMin: number;
  readonly jornadaHoras: number;
}
