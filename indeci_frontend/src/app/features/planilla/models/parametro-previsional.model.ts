export type EstadoParametro = 'VIGENTE' | 'PROGRAMADO' | 'CERRADO' | 'INACTIVO' | 'ANULADO';
export type TipoComision = 'FLUJO' | 'SALDO' | 'MIXTA' | 'NO_APLICA';
export type TipoSistemaPensionario = 'ONP' | 'AFP' | 'SIN_REGIMEN';

export interface AfpCatalogRow {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface AfpParametroRow {
  id: number;
  afpId: number;
  afpNombre: string;
  periodoInicio: string;
  periodoFin: string | null;
  aporteObligatorioPct: number;
  comisionFlujoPct: number;
  comisionSaldoAnualPct: number;
  primaSeguroPct: number;
  remuneracionMaximaAsegurable: number;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
  estado: EstadoParametro;
  bloqueadoPorPlanilla: boolean;
  creadoPor: string;
  creadoEn: string;
}

export interface AfpParametroInput {
  afpId: number;
  periodoInicio: string;
  periodoFin: string | null;
  aporteObligatorioPct: number;
  comisionFlujoPct: number;
  comisionSaldoAnualPct: number;
  primaSeguroPct: number;
  remuneracionMaximaAsegurable: number;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
}

export interface OnpParametroRow {
  id: number;
  periodoInicio: string;
  periodoFin: string | null;
  aporteOnpPct: number;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
  estado: EstadoParametro;
  bloqueadoPorPlanilla: boolean;
  creadoPor: string;
  creadoEn: string;
}

export interface OnpParametroInput {
  periodoInicio: string;
  periodoFin: string | null;
  aporteOnpPct: number;
  fuenteOficial: string;
  urlFuenteOficial: string | null;
  fechaPublicacion: string | null;
  observacion: string | null;
}

export interface PrevisionalKpi {
  afpVigentes: number;
  onpVigente: number;
  proximaVigencia: number;
  ultimaActualizacionSbs: string | null;
}

export type EstadoValidacionPrevisional = 'VALIDO' | 'CONFIG_INCOMPLETA' | 'SIN_VIGENCIA';

export interface ResolverParametroResult {
  encontrado: boolean;
  // Contexto del empleado
  empleadoId: number | null;
  empleadoNombre: string | null;
  documento: string | null;
  periodoConsultado: string | null;
  // Estado de validación
  estadoValidacion: EstadoValidacionPrevisional | null;
  // Datos previsionales
  sistemaPensionario: TipoSistemaPensionario | null;
  afpId: number | null;
  afpNombre: string | null;
  tipoComision: TipoComision | null;
  aporteOnpPct: number | null;
  aporteObligatorioPct: number | null;
  comisionFlujoPct: number | null;
  comisionSaldoAnualPct: number | null;
  primaSeguroPct: number | null;
  remuneracionMaximaAsegurable: number | null;
  vigenciaInicio: string | null;
  vigenciaFin: string | null;
  fuente: string | null;
  mensaje: string | null;
}

export interface DuplicarVigenciaRequest {
  periodoInicio: string;
  fuenteOficial: string;
  observacion: string;
}

export interface AnularVigenciaRequest {
  motivo: string;
}

export interface HistorialPrevisionalRow {
  id: number;
  tipo: 'AFP' | 'ONP';
  afpNombre: string | null;
  accion: string;
  descripcion: string;
  usuario: string;
  fecha: string;
  periodoAfectado: string | null;
}
