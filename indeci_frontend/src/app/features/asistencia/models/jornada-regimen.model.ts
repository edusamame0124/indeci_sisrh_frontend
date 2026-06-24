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
  /** V010_95 — día con tardanza > este umbral se descuenta completo (Descuento 1). */
  readonly umbralTardanzaDiariaMin: number;
  /** V010_95 — tope mensual de tardanzas ≤ umbral; el exceso se descuenta (Descuento 2). */
  readonly topeTardanzaMensualMin: number;
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
  readonly umbralTardanzaDiariaMin: number;
  readonly topeTardanzaMensualMin: number;
  readonly jornadaHoras: number;
}
