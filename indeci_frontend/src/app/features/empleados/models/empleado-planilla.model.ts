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
  // Etiquetas resueltas por el backend para el listado.
  readonly regimenLaboral: string | null;
  readonly tipoContrato: string | null;
  readonly condicionLaboral: string | null;
}
