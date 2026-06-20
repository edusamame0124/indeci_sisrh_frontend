export type EstadoEssalud = 'VIGENTE' | 'PROGRAMADO' | 'CERRADO' | 'ANULADO';

export interface EssaludVigenciaRow {
  id: number;
  anioVigencia: number;
  vigenciaInicio: string;
  vigenciaFin: string | null;
  uitVigente: number;
  pctBaseCas: number;
  pctEssalud: number;
  aplicaEps: boolean;
  pctEssaludEps: number | null;
  pctCreditoEps: number | null;
  baseMaximaCas: number;
  essaludMaximoCas: number;
  essaludConEpsMax: number | null;
  creditoEpsMax: number | null;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
  estado: EstadoEssalud;
  bloqueadoPorPlanilla: boolean;
  creadoPor: string;
  creadoEn: string;
}

export interface EssaludVigenciaInput {
  vigenciaInicio: string;
  vigenciaFin: string | null;
  uitVigente: number;
  pctBaseCas: number;
  pctEssalud: number;
  aplicaEps: boolean;
  pctEssaludEps: number | null;
  pctCreditoEps: number | null;
  fuenteOficial: string;
  fechaPublicacion: string | null;
  observacion: string | null;
}

export interface EssaludDuplicarInput {
  vigenciaInicio: string;
  vigenciaFin: string | null;
  uitVigente: number;
  fuenteOficial: string;
  observacion: string | null;
}

export interface EssaludAnularInput {
  motivo: string;
}

export type EstadoValidacionEssalud = 'VALIDO' | 'SIN_VIGENCIA' | 'CONFIG_INCOMPLETA';

export interface EssaludResolverResult {
  encontrado: boolean;
  empleadoId: number | null;
  empleadoNombre: string | null;
  documento: string | null;
  periodoConsultado: string | null;
  regimenLaboral: string | null;
  vigenciaId: number | null;
  vigenciaInicio: string | null;
  vigenciaFin: string | null;
  uitVigente: number | null;
  pctBaseCas: number | null;
  pctEssalud: number | null;
  pctEssaludEps: number | null;
  pctCreditoEps: number | null;
  fuenteOficial: string | null;
  remuneracionCas: number | null;
  tieneEps: boolean;
  limiteUit: number | null;
  baseAplicable: number | null;
  essalud9: number | null;
  essaludEps675: number | null;
  creditoEps225: number | null;
  estadoValidacion: EstadoValidacionEssalud | null;
  mensaje: string | null;
}
