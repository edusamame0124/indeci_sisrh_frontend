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
