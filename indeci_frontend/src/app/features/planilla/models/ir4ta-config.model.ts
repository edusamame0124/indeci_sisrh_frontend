export type EstadoIr4ta = 'BORRADOR' | 'VIGENTE' | 'CERRADO' | 'ANULADO';

export interface Ir4taConfigRow {
  id: number;
  anioFiscal: number;
  vigenciaInicio: string;
  vigenciaFin: string | null;
  uitVigente: number;
  tasaIr4ta: number;
  baseInafectaIr4ta: number | null;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
  estado: EstadoIr4ta;
  bloqueadoPorPlanilla: boolean;
  creadoPor: string;
  creadoEn: string;
  modificadoPor: string | null;
  modificadoEn: string | null;
}

export interface Ir4taConfigInput {
  anioFiscal: number;
  vigenciaInicio: string;
  vigenciaFin: string | null;
  uitVigente: number;
  tasaIr4ta: number | null;
  baseInafectaIr4ta: number | null;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
}

export interface Ir4taConfigAnularInput {
  motivo: string;
}

export interface Ir4taConfigDuplicarInput {
  anioFiscal: number;
  vigenciaInicio: string;
  vigenciaFin: string | null;
  uitVigente: number;
  fuenteOficial: string;
  observacion: string | null;
}

export interface Ir4taResolverResult {
  encontrado: boolean;
  periodoConsultado: string | null;
  anioFiscal: number | null;
  vigenciaId: number | null;
  vigenciaInicio: string | null;
  vigenciaFin: string | null;
  uitVigente: number | null;
  tasaIr4ta: number | null;
  baseInafectaIr4ta: number | null;
  fuenteOficial: string | null;
  estadoValidacion: 'VALIDO' | 'SIN_VIGENCIA' | 'CONFIG_INCOMPLETA' | null;
  mensaje: string | null;
}
