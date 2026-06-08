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
