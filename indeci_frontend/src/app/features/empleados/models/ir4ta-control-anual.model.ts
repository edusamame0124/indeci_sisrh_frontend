/**
 * Control anual del tope de suspensión IR4ta de un trabajador (pendiente B2).
 * Espejo de Ir4taControlAnualDto (backend). Todos los montos son calculados.
 */
export type TipoTopeIr4ta = 'GENERAL_CAS' | 'DIRECTOR_SIMILAR';

export type EstadoControlIr4ta =
  | 'VIGENTE'
  | 'ALERTA_80_PORCIENTO'
  | 'ALERTA_90_PORCIENTO'
  | 'CERCA_DEL_TOPE'
  | 'EXCEDE_TOPE_REQUIERE_VALIDACION'
  | 'REINICIO_CONFIRMADO'
  | 'RETENCION_ACTIVA'
  | 'VENCIDA'
  | 'ANULADA'
  | '-';

export interface Ir4taControlAnual {
  empleadoId: number;
  anioFiscal: number;
  aplicaControl: boolean;

  existeConstanciaVigente: boolean;
  nroConstancia: string | null;
  estadoConstancia: string;

  tipoTope: TipoTopeIr4ta;
  topeAnual: number | null;

  acumuladoIndeci: number | null;
  saldoDisponible: number | null;
  pctConsumido: number | null;
  ultimoPeriodoCalc: string | null;

  estadoControl: EstadoControlIr4ta;
  periodoExceso: string | null;
  fechaDeteccionExceso: string | null;

  periodoReinicio: string | null;
  sustentoReinicio: string | null;
  confirmadoPor: string | null;
  confirmadoEn: string | null;
}

/** Cuerpo para confirmar el reinicio de retención (RR.HH.). */
export interface Ir4taReinicioInput {
  anioFiscal: number;
  periodoReinicio: string;
  sustento: string;
  observacion?: string | null;
}

export interface Ir4taAcumuladoDetalle {
  periodo: string;
  ingresosBrutos: number;
  deducciones: number;
  baseAfecta: number;
}
