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
