import type { ConceptoModoCalculo } from './concepto-wizard.model';

/** Tipo de concepto de planilla (campo legacy `TIPO`). */
export type ConceptoPlanillaTipo = 'INGRESO' | 'DESCUENTO';

/** Clasificación MEF del concepto (campo `TIPO_CONCEPTO` — Spec 010/013). */
export type ConceptoPlanillaTipoConcepto =
  | 'REMUNERATIVO'
  | 'NO_REMUNERATIVO'
  | 'DESCUENTO'
  | 'APORTE_TRABAJADOR'
  | 'APORTE_EMPLEADOR';

/**
 * Ciclo de vida del concepto (SPEC_CONCEPTOS_PLANILLA §8/D1).
 * El motor sigue leyendo `activo` en P1; `estado` gobierna las transiciones UI.
 */
export type ConceptoPlanillaEstado =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'ACTIVO'
  | 'CERRADO'
  | 'ANULADO';

/**
 * Mirrors `ConceptoPlanillaDto` (Java request).
 *
 * P1 (SPEC_CONCEPTOS_PLANILLA §10.3) — el contrato de escritura expone todos los
 * campos editables del concepto. `estado` NO es editable libremente: se fuerza a
 * BORRADOR al crear y cambia por los endpoints de transición.
 * Los campos `S`/`N` viajan como string para reflejar el char Oracle.
 */
export interface ConceptoPlanillaInput {
  /**
   * Código del concepto. OPCIONAL en alta (§13): el backend lo auto-genera
   * (`CONC-####`) al Registrar. En edición se conserva el código existente.
   */
  codigo?: string | null;
  nombre: string;
  tipo: ConceptoPlanillaTipo;
  naturaleza: string;

  /**
   * Tipo de Concepto (catálogo funcional SISPER — §13). El backend deriva el
   * `tipoConcepto`/`TIPO_CONCEPTO` del motor a partir de este código.
   */
  tipoConceptoInterno?: string | null;

  // Clasificación MEF / motor (derivada del catálogo; se envía el tipo legacy).
  tipoConcepto?: ConceptoPlanillaTipoConcepto | null;

  // Códigos externos (AIRHSP / SISPER / PLAME / MCPP / SUNAT / RTPS)
  codigoMef?: string | null;
  codigoSisper?: string | null;
  codigoPlameSunat?: string | null;
  codigoMcpp?: string | null;
  codigoTributoSunat?: string | null;
  rtpsCodigo?: string | null;

  // Afectaciones tributarias / previsionales (S / N)
  afectoIr5ta?: string | null;
  afectoAportePens?: string | null;
  afectoEssalud?: string | null;

  // Banderas LEY-07 MUC vs CUC (S / N)
  esMuc?: string | null;
  esCuc?: string | null;

  // Aplicabilidad
  regimenAplicable?: string | null;
  fechaVigIni?: string | null;
  fechaVigFin?: string | null;

  /**
   * Tipos de planilla asociados al concepto (códigos del catálogo
   * `INDECI_PLANILLA_TIPO`). SPEC_CONCEPTOS_PLANILLA §15 (Fase A): relación M:N.
   * El backend exige ≥1 código en alta/edición (400 si llega vacío).
   */
  planillaTipos: string[];

  // Motor v3 — prorrateo por días laborados (S / N)
  esProrrateable?: string | null;

  /**
   * Modo de cálculo (P4 — §14). Cómo se origina el monto del concepto.
   * Opcional: el backend asume `RESULTADO_MOTOR` si llega null. El motor NO se
   * ramifica por este valor; es metadata/intención registrada.
   */
  modoCalculo?: ConceptoModoCalculo | null;

  /**
   * Homologación con el catálogo oficial MGRH / MEF
   * (SPEC_HOMOLOGACION_MGRH §C.2 · §D5). FK única nullable al catálogo:
   * `null` = Pendiente de homologación; con valor = Homologado. No bloquea
   * crear/editar/activar el concepto.
   */
  catalogoConceptoMgrhId?: number | null;

  /** Observación interna de la homologación MGRH (opcional). */
  observacionHomologacionMgrh?: string | null;

  /** ¿Se incluye en planilla de pago? 'S' (≥1 planilla) / 'N' (solo config/cálculo/control). */
  incluyeEnPlanilla?: 'S' | 'N' | null;
}

/** Estado de homologación derivado por backend (SPEC_HOMOLOGACION_MGRH §D5). */
export type ConceptoEstadoHomologacionMgrh = 'HOMOLOGADO' | 'PENDIENTE';

/**
 * Resumen read-only del concepto MGRH homologado, devuelto en la respuesta del
 * concepto para precargar la pestaña sin volver a buscar (SPEC_HOMOLOGACION_MGRH §F).
 */
export interface ConceptoMgrhResumen {
  readonly id: number;
  readonly tipo: string;
  readonly codigoConceptoMgrh: string;
  readonly descripcionNorma: string | null;
}

/**
 * Mirrors `ConceptoPlanillaResponseDto` (Java response).
 *
 * F3.2 — campos extendidos del catálogo enriquecido para que la UI muestre
 * chips visuales por afectación, vigencia, MUC/CUC y régimen aplicable.
 * Los campos `S`/`N` se devuelven como strings desde el backend.
 */
export interface ConceptoPlanillaRow {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: ConceptoPlanillaTipo;
  readonly naturaleza: string;
  readonly activo: number;

  /** Ciclo de vida (P1 — SPEC_CONCEPTOS_PLANILLA §10.3). */
  readonly estado?: ConceptoPlanillaEstado | null;

  /**
   * N.º de versión por CÓDIGO (P3 — SPEC_CONCEPTOS_PLANILLA §12).
   * El catálogo muestra solo la versión vigente; el resto se ve en Historial.
   */
  readonly version?: number | null;

  /** Catálogo RTPS / PDT 601 (P1). */
  readonly rtpsCodigo?: string | null;
  readonly rtpsDescripcion?: string | null;

  /** Campos MEF (Spec 013 / C1) — pueden ser null en BD. */
  readonly codigoMef?: string | null;
  readonly codigoSisper?: string | null;
  readonly tipoConcepto?: ConceptoPlanillaTipoConcepto | null;
  /** Tipo de Concepto funcional SISPER (catálogo §13); deriva `tipoConcepto`. */
  readonly tipoConceptoInterno?: string | null;
  readonly codigoTributoSunat?: string | null;

  // F3.2 — códigos externos
  readonly codigoPlameSunat?: string | null;
  readonly codigoMcpp?: string | null;

  // F3.2 — afectaciones tributarias / previsionales (S / N)
  readonly afectoIr5ta?: string | null;
  readonly afectoAportePens?: string | null;
  readonly afectoEssalud?: string | null;

  // F3.2 — banderas LEY-07 MUC vs CUC
  readonly esMuc?: string | null;
  readonly esCuc?: string | null;

  /**
   * Régimen aplicable. Acepta valor único ("276", "728", "1057", "SERVIR",
   * "TODOS") o CSV ("728,1057") según F1.5b para los DS de pacto colectivo.
   */
  readonly regimenAplicable?: string | null;

  readonly fechaVigIni?: string | null;
  readonly fechaVigFin?: string | null;

  /** S/N — motor v3 prorratea por días laborados si "S". */
  readonly esProrrateable?: string | null;

  /** Modo de cálculo (P4 — §14). Default backend `RESULTADO_MOTOR`. */
  readonly modoCalculo?: ConceptoModoCalculo | null;

  /**
   * Códigos de los tipos de planilla asociados (SPEC §15 — Fase A). La lista
   * de conceptos resuelve cada código → nombre con el catálogo cargado. Puede
   * faltar en respuestas antiguas; el front lo trata como "sin asociaciones".
   */
  readonly planillaTipos?: readonly string[] | null;

  /**
   * Homologación MGRH / MEF (SPEC_HOMOLOGACION_MGRH §C.2 · §F). `catalogoConceptoMgrhId`
   * = FK al catálogo (null = pendiente); `estadoHomologacionMgrh` lo deriva el
   * backend; `mgrhResumen` permite precargar el detalle sin re-buscar.
   */
  readonly catalogoConceptoMgrhId?: number | null;
  readonly estadoHomologacionMgrh?: ConceptoEstadoHomologacionMgrh | null;
  readonly mgrhResumen?: ConceptoMgrhResumen | null;
  /** Observación interna de la homologación MGRH (opcional). */
  readonly observacionHomologacionMgrh?: string | null;
  /** ¿Se incluye en planilla de pago? 'S' (≥1 planilla) / 'N' (solo config/cálculo/control). */
  readonly incluyeEnPlanilla?: 'S' | 'N' | null;
}
