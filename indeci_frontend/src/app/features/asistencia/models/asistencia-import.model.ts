export type EstadoImportacion = 'BORRADOR_PREVIEW' | 'CONFIRMADA' | 'PARCIAL' | 'FALLIDA';

export type EstrategiaConflicto =
  | 'OMITIR_EXISTENTES'
  | 'REEMPLAZAR_EMPLEADOS_ARCHIVO'
  | 'REEMPLAZAR_PERIODO_COMPLETO'
  | 'CANCELAR';

export interface AsistenciaImportFilaError {
  readonly linea: number;
  readonly dni: string | null;
  readonly fecha: string | null;
  readonly severidad: 'VALIDA' | 'ERROR' | 'WARN' | 'OBSERVADA';
  readonly mensaje: string;
  readonly contenido: string | null;
}

export interface AsistenciaImportEmpleadoResumen {
  readonly empleadoId: number;
  readonly dni: string;
  readonly nombreMarcador: string | null;
  readonly nombreSistema: string | null;
  readonly empleadoEncontrado: boolean;
  readonly diasLaborados: number;
  readonly diasFalta: number;
  readonly totalMinTardanza: number;
  readonly minutosSalidaAnticipada: number;
  readonly marcasIncompletas: number;
  readonly diasObservados: number;
  readonly remuneracionBase: number;
  readonly baseOrigen: string;
  readonly descuentoTardanza: number;
  readonly descuentoFalta: number;
  readonly descuentoTotal: number;
  readonly estadoCabeceraPropuesto: string;
  readonly conflictoExistente: boolean;
  readonly advertencias: readonly string[];
}

export interface AsistenciaImportPreview {
  readonly importacionId: number | null;
  readonly periodo: string;
  readonly nombreArchivo: string;
  readonly encoding: string | null;
  readonly hashArchivo: string;
  readonly filasTotal: number;
  readonly filasValidas: number;
  readonly filasValidasLimpias: number;
  readonly filasAdvertencia: number;
  readonly filasError: number;
  readonly filasObservadas: number;
  readonly empleadosDetectados: number;
  readonly empleadosConError: number;
  readonly estadoImportacion: EstadoImportacion;
  readonly mensaje: string | null;
  readonly empleados: readonly AsistenciaImportEmpleadoResumen[];
  readonly errores: readonly AsistenciaImportFilaError[];
}

export interface AsistenciaImportHistorial {
  readonly id: number;
  readonly periodo: string;
  readonly nombreArchivo: string;
  readonly usuario: string;
  readonly fechaImportacion: string;
  readonly estado: EstadoImportacion;
  readonly filasTotal: number;
  readonly filasValidas: number;
  readonly filasError: number;
  readonly empleadosProcesados: number;
  /** REQUIERE_CALCULO | VALIDADO | null (no aplica). Solo lectura en el historial. */
  readonly estadoValidacion: 'REQUIERE_CALCULO' | 'VALIDADO' | null;
}

export interface AsistenciaValidacionBatch {
  readonly importacionId: number;
  readonly periodo: string;
  readonly totalCabeceras: number;
  readonly validadas: number;
  readonly omitidas: number;
  readonly observadas: number;
  readonly yaValidadas: number;
}

export interface SpringPage<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly number: number;
  readonly size: number;
}

/** F2/F3 — fila del detalle paginado server-side (24 columnas, minutos numéricos). */
export interface AsistenciaImportFilaDetalle {
  readonly id: number;
  readonly numeroFila: number;
  readonly empleadoId: number | null;
  readonly estado: 'VALIDA' | 'WARN' | 'OBSERVADA' | 'ERROR';
  readonly dni: string | null;
  readonly empleadoSistema: string | null;
  readonly nombreCsv: string | null;
  readonly fecha: string | null;
  readonly dia: string | null;
  readonly entradaProg: string | null;
  readonly salidaProg: string | null;
  readonly marca1: string | null;
  readonly marca2: string | null;
  readonly marca3: string | null;
  readonly marca4: string | null;
  readonly tardanzaMin: number | null;
  readonly refrigerioMin: number | null;
  readonly excesoRefrigMin: number | null;
  readonly tiempoRefrigMin: number | null;
  readonly tiempoAntesSalMin: number | null;
  readonly horasTrabMin: number | null;
  readonly horasExtra25Min: number | null;
  readonly horasExtra35Min: number | null;
  readonly horasExtra100Min: number | null;
  readonly horasExtraTotalMin: number | null;
  readonly observaciones: string | null;
  readonly mensajeValidacion: string | null;
  readonly aceptadaObservada: boolean;
}

/** F2/F3 — resumen liviano de la importación (banda de estado del paso "Validar"). */
export interface AsistenciaImportResumen {
  readonly importacionId: number;
  readonly nombreArchivo: string;
  readonly periodo: string;
  readonly periodoDetectadoIni: string | null;
  readonly periodoDetectadoFin: string | null;
  readonly filasLeidas: number;
  readonly filasValidas: number;
  readonly filasObservadas: number;
  readonly filasError: number;
  readonly empleadosDetectados: number;
  readonly estado: EstadoImportacion;
  readonly hashArchivo: string;
  readonly tamanoBytes: number | null;
  readonly duplicadoHashPrevio: boolean;
  readonly usuario: string;
  readonly fechaImportacion: string;
  readonly usuarioValidacion: string | null;
  readonly fechaValidacion: string | null;
  readonly usuarioConfirmacion: string | null;
  readonly fechaConfirmacion: string | null;
}

/** Filtros del detalle server-side. */
export interface AsistenciaImportDetalleFiltro {
  readonly dni?: string;
  readonly nombre?: string;
  readonly estado?: string;
  readonly soloErrores?: boolean;
}

/** F2 (COEN) — nombre del marcador sin mapear a un empleado + días afectados. */
export interface MarcadorSinMapeo {
  readonly nombreMarcador: string;
  readonly dias: number;
}

/** F2 (COEN) — petición para mapear un nombre del marcador a un empleado. */
export interface MarcadorAliasRequest {
  readonly empleadoId: number;
  readonly nombreMarcador: string;
  readonly origen?: string;
}

/** F2 (COEN) — alias creado/actualizado. */
export interface MarcadorAlias {
  readonly id: number;
  readonly empleadoId: number;
  readonly nombreMarcadorNorm: string;
  readonly nombreMarcadorOriginal: string | null;
  readonly origen: string;
}
