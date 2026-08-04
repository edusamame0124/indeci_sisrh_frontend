export interface PadronVacacionalRowDto {
  empleadoId: number;
  dni: string;
  nombreCompleto: string;
  regimenLaboral: string;
  cargo: string;
  dependencia: string;
  aniosServicio: number;
  mesesServicio: number;
  diasServicio: number;
  // SPEC_VACACIONES F9.1 — días no computables al récord (D.S. 013-2019-PCM art. 11)
  diasNoComputablesLsg: number | null;
  diasNoComputablesFaltas: number | null;
  aniosEfectivos: number | null;
  mesesEfectivos: number | null;
  diasEfectivos: number | null;
  diasCorresponden: number;
  diasGozados: number;
  saldo: number;
  estadoRecord: string;
  sinVinculo: boolean;
  // F9.3 — D.S. 013-2019-PCM: acumulación de períodos vacacionales sin gozar (≤2 permitido
  // sin evaluación; el 3ro NUNCA bloquea/pierde saldo automático, solo requiere decisión RR.HH.)
  periodosAcumuladosSinGozar: number;
  requiereDecisionAcumulacion: boolean;
  /** V012_55 — true si el empleado tiene al menos un goce registrado por Override. */
  tieneOverride: boolean;
}

export interface PadronVacacionalPageDto {
  content: PadronVacacionalRowDto[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface GoceDirectoPayload {
  empleadoId: number;
  fechaInicio: string;
  fechaFin: string;
  esAdelanto: boolean;
  documentoSustento: string;
  motivoExcepcion: string;
}

/** F9.3 — payload para registrar la decisión de RR.HH. sobre la acumulación de un empleado. */
export interface AcumulacionDecisionPayload {
  motivoDecision: string;
  documentoSustento: string;
}

export interface AcumulacionDecisionDto {
  id: number;
  empleadoId: number;
  periodosPendientesAlMomento: number;
  motivoDecision: string;
  documentoSustento: string | null;
  usuarioRegistro: string;
  createdAt: string;
}

/** "Provisionar Auto" — un cambio aplicado, espejo de `CorreccionSaldoDto`. */
export interface CorreccionSaldo {
  anio: number;
  ganadosAnterior: number;
  ganadosNuevo: number;
  gozados: number;
  /** "CREADO" | "ANULADO" */
  tipo: string;
}

/** "Provisionar Auto" — resultado del recálculo, espejo de `RecalculoManualResultDto`. */
export interface RecalculoManualResult {
  cambios: CorreccionSaldo[];
  sinCambios: number;
}

/** "Provisionar Auto" — payload obligatorio, espejo de `ProvisionarAutoRequestDto`. */
export interface ProvisionarAutoPayload {
  sustento: string;
}

/** Desglose de días NO computables (espejo de `DiasNoComputablesDto`). */
export interface DiasNoComputables {
  lsg: number;
  faltas: number;
  suspensiones: number;
  total: number;
}

/** Acumulado de la carrera (espejo de `TiempoServicioDetalleDto`) — reconcilia con Vinculación. */
export interface TiempoServicioDetalle {
  tiempoServicio: { anios: number; meses: number; dias: number } | null;
  diasNoComputables: DiasNoComputables;
  aniversarioEfectivo: string | null;
  aniosEfectivos: number;
  mesesEfectivos: number;
  diasEfectivos: number;
  totalDiasEfectivos: number;
}

/** Un período del récord (espejo de `PeriodoRecordDto`). */
export interface PeriodoRecord {
  numero: number;
  desde: string;
  hasta: string;
  lsg: number;
  faltas: number;
  suspensiones: number;
  diasEfectivos: number;
  recordOk: boolean;
  diasGanados: number;
}

/** Trazabilidad Visual — una fila de goce (INDECI_VACACIONES), espejo de `GoceRegistradoDto`. */
export interface GoceRegistrado {
  id: number;
  fechaRegistro: string | null;
  usuarioRegistro: string | null;
  periodoDesde: string;
  periodoHasta: string;
  dias: number | null;
  tipoGoce: string | null;
  origen: string | null;
  esAdelanto: number | null;
  documentoSustento: string | null;
  motivoExcepcion: string | null;
  estado: string | null;
}

/** Detalle de récord vacacional (Opción A), espejo de `RecordVacacionalDetalleDto`. */
export interface RecordVacacionalDetalle {
  sinVinculo: boolean;
  acumulado: TiempoServicioDetalle;
  periodos: PeriodoRecord[];
  /** V012_55 — el goce por Override más reciente del empleado, o null si nunca tuvo uno. */
  ultimoOverride: GoceRegistrado | null;
}

/** "Provisionar para todos" — resumen del lote, espejo de `ProvisionMasivaResultDto`. */
export interface ProvisionMasivaResult {
  total: number;
  provisionados: number;
  sinCambios: number;
  errores: string[];
}

/** "Editar Gozados" — payload obligatorio, espejo de `CorregirGozadosDto`. */
export interface CorregirGozadosPayload {
  nuevoTotalGozado: number;
  motivo: string;
}

/** "Editar Gozados" — resultado de la corrección, espejo de `CorreccionGozadosResultDto`. */
export interface CorreccionGozadosResult {
  gozadoAnterior: number;
  gozadoNuevo: number;
  delta: number;
}

/** Trazabilidad Visual — una fila del historial completo (activos + anulados), espejo de `HistorialSaldoDto`. */
export interface HistorialSaldoRow {
  id: number;
  anio: number;
  diasGanados: number;
  diasGozados: number;
  diasSaldo: number;
  origen: string | null;
  activo: number;
  observacion: string | null;
  createdAt: string;
}
