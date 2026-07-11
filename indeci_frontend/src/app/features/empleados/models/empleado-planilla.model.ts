/** Cuerpo POST/PUT — espejo de `EmpleadoPlanillaDto` (backend). */
export interface EmpleadoPlanillaInput {
  readonly empleadoId: number;
  readonly sueldoBasico: number;
  readonly codigoAirhsp: string;
  readonly montoContrato: number;
  readonly tieneAsignacionFamiliar?: number;
  readonly numHijos?: number;
  /** @deprecated UI ya no envía; backend fuerza null. */
  readonly movilidad?: number;
  /** @deprecated UI ya no envía; backend fuerza null. */
  readonly alimentacion?: number;
  readonly descuentoBanco?: number;
  readonly descuentoInstitucion?: number;
  // Configuración laboral (mejora 2026-06-03). Régimen requerido en UI.
  readonly regimenLaboralId: number;
  readonly tipoContratoId?: number | null;
  readonly condicionLaboralId?: number | null;
  readonly modalidadCasId?: number | null;
  /** Gate de Teletrabajo (Ley N° 31572, V012_28): 1 = habilitado por RR.HH. */
  readonly esTeletrabajador?: number | null;
  // Ley 30057 (V012_07)
  readonly grupoServidorCivil?: string | null;
  readonly esConfianza?: number | null;
  readonly tipoPersonaMefId?: number | null;
  readonly registroPlazaAirhsp?: string | null;
  readonly fechaInicioContrato?: string | null;
  readonly fechaFin?: string | null;
  /** SPEC_VACACIONES F9.1 — override de jornada (null=hereda régimen; 6=operativo COEN/DDI). */
  readonly diasSemanaOperativo?: number | null;
  // Cese (V012_04) — hechos que registra RR.HH.; el estado se deriva en backend.
  readonly fechaCese?: string | null;
  readonly motivoCese?: string | null;
  readonly documentoCese?: string | null;
  // Sustento de origen del vínculo (V012_08)
  readonly documentoOrigenTipo?: string | null;
  readonly documentoOrigenNumero?: string | null;
  readonly documentoOrigenFecha?: string | null;
}

/** Elegibilidad calculada del vínculo (F4a) — espejo de ElegibilidadVinculoDto. */
export interface ElegibilidadVinculoRow {
  readonly elegiblePlanilla: boolean;
  readonly elegibleMcpp: boolean;
  readonly cumple: readonly string[];
  readonly pendientes: readonly string[];
}

/** Fila del historial remunerativo (F2) — espejo de EmpleadoRemuneracionHistDto. */
export interface EmpleadoRemuneracionHistRow {
  readonly id: number;
  readonly vigenciaDesde: string;
  readonly vigenciaHasta: string | null;
  readonly montoBase: number | null;
  readonly remuneracionTotal: number;
  readonly tipoCambio: string | null;
  readonly documentoSustento: string | null;
  readonly fuente: string | null;
  readonly estado: string | null;
  readonly observacion: string | null;
  readonly createdBy: string | null;
  readonly createdAt: string | null;
}

/** Alta de cambio remunerativo (F2). */
export interface RemuneracionCambioInput {
  readonly vigenciaDesde: string;
  readonly montoBase?: number | null;
  readonly remuneracionTotal: number;
  readonly tipoCambio?: string | null;
  readonly documentoSustento?: string | null;
  readonly observacion?: string | null;
}

/** Fila de la tabla consolidada (todos los empleados) — espejo de `PlanillaConsolidadaRowDto`. */
export interface PlanillaConsolidadaRow {
  readonly empleadoId: number;
  readonly personaId: number;
  readonly nombreCompleto: string | null;
  readonly dni: string | null;
  readonly codigoInterno: string | null;
  readonly tieneConfig: boolean;
  readonly planillaId: number | null;
  readonly regimenLaboral: string | null;
  readonly tipoContrato: string | null;
  readonly condicionLaboral: string | null;
  readonly codigoAirhsp: string | null;
  readonly montoContrato: number | null;
  readonly sueldoBasico: number | null;
  /** @deprecated Ya no se muestra en UI consolidada. */
  readonly movilidad?: number | null;
  /** @deprecated Ya no se muestra en UI consolidada. */
  readonly alimentacion?: number | null;
  readonly tieneAsignacionFamiliar?: number | null;
  readonly numHijos?: number | null;
}

/** Fila listado — espejo de `EmpleadoPlanillaResponseDto`. */
export interface EmpleadoPlanillaRow {
  readonly id: number;
  readonly sueldoBasico: number;
  readonly codigoAirhsp: string | null;
  readonly montoContrato: number | null;
  /** @deprecated Ya no se muestra en listado por persona. */
  readonly movilidad?: number | null;
  /** @deprecated Ya no se muestra en listado por persona. */
  readonly alimentacion?: number | null;
  readonly tieneAsignacionFamiliar: number | null;
  readonly numHijos: number | null;
  readonly activo: number;
  // ===== Spec 009 / T138 — descuentos sí vienen en el response (faltaban en frontend) =====
  readonly descuentoBanco: number | null;
  readonly descuentoInstitucion: number | null;
  // ===== Configuración laboral (mejora 2026-06-03) =====
  readonly regimenLaboralId: number | null;
  readonly tipoContratoId: number | null;
  readonly condicionLaboralId: number | null;
  readonly modalidadCasId?: number | null;
  /** Gate de Teletrabajo (Ley N° 31572, V012_28): 1 = habilitado por RR.HH. */
  readonly esTeletrabajador: number | null;
  readonly grupoServidorCivil: string | null;
  readonly esConfianza: number | null;
  readonly regimenLaboral: string | null;
  readonly tipoContrato: string | null;
  readonly condicionLaboral: string | null;
  readonly tipoPersonaMefId: number | null;
  readonly registroPlazaAirhsp: string | null;
  readonly fechaInicioContrato: string | null;
  readonly fechaFin: string | null;
  /** SPEC_VACACIONES F9.1 — override de jornada (null=hereda régimen; 6=operativo). */
  readonly diasSemanaOperativo: number | null;
  // ===== Cese + estado derivado (V012_04) =====
  readonly fechaCese: string | null;
  readonly motivoCese: string | null;
  readonly documentoCese: string | null;
  // Sustento de origen del vínculo (V012_08)
  readonly documentoOrigenTipo: string | null;
  readonly documentoOrigenNumero: string | null;
  readonly documentoOrigenFecha: string | null;
  /** Derivado en backend: PROGRAMADO/VIGENTE/VENCIDO_PENDIENTE_DE_REGULARIZACION/CESADO/ANULADO. */
  readonly estadoVinculo: string | null;
  /** true si el cese formal está completo (habilita generar LBS). */
  readonly habilitaLbs: boolean | null;
}

/**
 * SPEC_VACACIONES F1/F2 — tiempo de servicio del empleado (espejo de `TiempoServicioDto`).
 * Cómputo 30/360 (D.Leg. 1405) acumulando vínculos secuenciales; read-only.
 */
export interface TiempoServicioRow {
  readonly empleadoId: number;
  readonly fechaIngreso: string | null;
  readonly fechaCorte: string | null;
  readonly anios: number;
  readonly meses: number;
  readonly dias: number;
  readonly totalDias360: number;
  readonly numVinculos: number;
  readonly tieneTraslape: boolean;
}

/** SPEC_VACACIONES F9.1 — desglose de días no computables (LSG + faltas). */
export interface DiasNoComputablesRow {
  readonly lsg: number;
  readonly faltas: number;
  readonly total: number;
}

/** Espejo de `TiempoServicioDetalleDto` — antigüedad + días no computables + aniversario efectivo. */
export interface TiempoServicioDetalleRow {
  readonly tiempoServicio: TiempoServicioRow | null;
  readonly diasNoComputables: DiasNoComputablesRow;
  readonly aniversarioEfectivo: string | null;
}
