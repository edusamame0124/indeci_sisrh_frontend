/** Modelos del módulo de Asignación Anual de Metas Presupuestales (V010_77). */

export type MetaCatEstado = 'BORRADOR' | 'VALIDADO' | 'PUBLICADO' | 'CERRADO' | 'ANULADO';
export type MetaEmpEstado = 'BORRADOR' | 'VALIDADO' | 'PUBLICADO' | 'CERRADO' | 'ANULADO' | 'OBSERVADO';
export type MetaLoteEstado = 'CREADO' | 'PROCESANDO' | 'VALIDADO' | 'OBSERVADO' | 'PUBLICADO' | 'ANULADO' | 'ERROR';
export type MetaEquivEstado = 'BORRADOR' | 'VALIDADO' | 'PUBLICADO' | 'ANULADO';
export type MetaLoteTipo =
  | 'CARGA_CATALOGO'
  | 'COPIA_ANIO_ANTERIOR'
  | 'APLICACION_EQUIVALENCIAS'
  | 'IMPORTACION_EXCEL'
  | 'PUBLICACION_ANUAL'
  | 'REGULARIZACION';
export type MetaDetEstado =
  | 'OK'
  | 'OBSERVADO'
  | 'SIN_EQUIVALENCIA'
  | 'META_DESTINO_INACTIVA'
  | 'EMPLEADO_INACTIVO'
  | 'DUPLICADO'
  | 'ERROR';

/** Entrada del catálogo de metas presupuestales. */
export interface MetaPptoCat {
  readonly id: number;
  readonly anioFiscal: number;
  readonly metaCodigo: string;
  readonly centroCosto: string;
  readonly categoriaPresupuestal: string;
  readonly producto: string;
  readonly actividad: string;
  readonly finalidad: string;
  readonly metaHash: string | null;
  readonly estado: MetaCatEstado;
  readonly activo: number;
  readonly fuente: string | null;
  readonly observacion: string | null;
  readonly creadoPor: string;
  readonly creadoEn: string;
  readonly modificadoPor: string | null;
  readonly modificadoEn: string | null;
  readonly motivoAnulacion: string | null;
}

export interface MetaPptoCatDto {
  anioFiscal: number;
  metaCodigo: string;
  centroCosto: string;
  categoriaPresupuestal: string;
  producto: string;
  actividad: string;
  finalidad: string;
  fuente?: string | null;
  observacion?: string | null;
}

/** Asignación anual de meta a un empleado. */
export interface EmpMetaAnual {
  readonly id: number;
  readonly empleadoId: number;
  readonly empleadoNombre: string | null;
  readonly empleadoDni: string | null;
  readonly anioFiscal: number;
  readonly metaPptoCatId: number;
  readonly metaCodigo: string | null;
  readonly centroCosto: string | null;
  readonly categoriaPresupuestal: string | null;
  readonly producto: string | null;
  readonly actividad: string | null;
  readonly finalidad: string | null;
  readonly vigenciaInicio: string;
  readonly vigenciaFin: string | null;
  readonly estado: MetaEmpEstado;
  readonly origen: string;
  readonly loteId: number | null;
  readonly bloqueadoPorPlanilla: number;
  readonly observacion: string | null;
  readonly creadoPor: string;
  readonly creadoEn: string;
  readonly modificadoPor: string | null;
  readonly modificadoEn: string | null;
  readonly motivoAnulacion: string | null;
}

export interface EmpMetaAnualDto {
  empleadoId: number;
  anioFiscal: number;
  metaPptoCatId: number;
  vigenciaInicio?: string | null;
  vigenciaFin?: string | null;
  observacion?: string | null;
  motivoAnulacion?: string | null;
}

/** Equivalencia entre metas de distintos años. */
export interface MetaPptoEquiv {
  readonly id: number;
  readonly anioOrigen: number;
  readonly metaOrigenId: number;
  readonly metaOrigenCodigo: string | null;
  readonly metaOrigenDescripcion: string | null;
  readonly anioDestino: number;
  readonly metaDestinoId: number;
  readonly metaDestinoCodigo: string | null;
  readonly metaDestinoDescripcion: string | null;
  readonly estado: MetaEquivEstado;
  readonly activo: number;
  readonly observacion: string | null;
  readonly creadoPor: string;
  readonly creadoEn: string;
  readonly motivoAnulacion: string | null;
}

export interface MetaPptoEquivDto {
  anioOrigen: number;
  metaOrigenId: number;
  anioDestino: number;
  metaDestinoId: number;
  observacion?: string | null;
}

/** Cabecera de proceso masivo. */
export interface MetaPptoLote {
  readonly id: number;
  readonly codigoLote: string;
  readonly anioOrigen: number | null;
  readonly anioDestino: number;
  readonly tipoProceso: MetaLoteTipo;
  readonly estado: MetaLoteEstado;
  readonly totalEmpleados: number;
  readonly totalAsignados: number;
  readonly totalObservados: number;
  readonly totalErrores: number;
  readonly totalSinEquiv: number;
  readonly totalInactivos: number;
  readonly totalDuplicados: number;
  readonly archivoOrigen: string | null;
  readonly observacion: string | null;
  readonly creadoPor: string;
  readonly creadoEn: string;
  readonly finalizadoEn: string | null;
  readonly motivoAnulacion: string | null;
}

export interface MetaPptoLoteDto {
  anioOrigen?: number | null;
  anioDestino: number;
  tipoProceso: MetaLoteTipo;
  observacion?: string | null;
  archivoOrigen?: string | null;
}

/** Fila de detalle de validación dentro de un lote. */
export interface MetaPptoLoteDet {
  readonly id: number;
  readonly loteId: number;
  readonly empleadoId: number;
  readonly empleadoNombre: string | null;
  readonly empleadoDni: string | null;
  readonly metaOrigenId: number | null;
  readonly metaOrigenCodigo: string | null;
  readonly metaDestinoId: number | null;
  readonly metaDestinoCodigo: string | null;
  readonly metaDestinoDescripcion: string | null;
  readonly empMetaAnualId: number | null;
  readonly estadoValidacion: MetaDetEstado;
  readonly mensajeValidacion: string | null;
  readonly accionSugerida: string | null;
}

export interface MetaResolverDto {
  loteDetId: number;
  metaDestinoId: number;
  observacion?: string | null;
}

/** Resultado de cambio de estado masivo de metas. */
export interface CambioEstadoMasivoResult {
  readonly exitosos: number;
  readonly omitidos: number;
  readonly errores: string[];
}

export type DeteccionEquivEstado =
  | 'OK_AUTOMATICO'
  | 'SIN_COINCIDENCIA'
  | 'COINCIDENCIA_MULTIPLE'
  | 'OBSERVADO';

/** Resultado por meta origen de la detección automática de equivalencias. */
export interface DeteccionEquivResult {
  readonly anioOrigen: number;
  readonly metaOrigenId: number;
  readonly metaOrigenCodigo: string;
  readonly centroCosto: string;
  readonly categoriaPresupuestal: string;
  readonly producto: string;
  readonly actividad: string;
  readonly finalidad: string;
  readonly trabajadoresAsignados: number;
  readonly metaDestinoId: number | null;
  readonly metaDestinoCodigo: string | null;
  readonly estadoDeteccion: DeteccionEquivEstado;
  readonly observacion: string | null;
  readonly equivalenciaId: number | null;
}

/** Resumen de estado de metas para un año fiscal. */
export interface MetaPptoResumen {
  readonly anioFiscal: number;
  readonly totalMetasCatalogo: number;
  readonly totalMetasPublicadas: number;
  readonly totalEmpleadosAsignados: number;
  readonly totalEmpleadosPublicados: number;
  readonly totalEmpleadosSinMeta: number;
  readonly totalEquivalencias: number;
  readonly estadoGeneral: string;
}

/** Fila enriquecida de trazabilidad — snapshot directo de INDECI_EMP_META_ANUAL. */
export interface EmpMetaTrazabilidad {
  readonly id: number;
  readonly empleadoNombre: string | null;
  readonly empleadoDni: string | null;
  readonly anioFiscal: number;
  readonly metaCodigo: string | null;
  readonly centroCosto: string | null;
  readonly categoriaPresupuestal: string | null;
  readonly producto: string | null;
  readonly actividad: string | null;
  readonly finalidad: string | null;
  readonly estado: MetaEmpEstado;
  readonly origen: string;
  readonly bloqueadoPorPlanilla: number;
  readonly creadoPor: string | null;
  readonly creadoEn: string | null;
  readonly observacion: string | null;
}

/** Wrapper paginado genérico (mismo patrón que PersonaResumenPageDto). */
export interface MetaPptoPage<T> {
  readonly content: T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
