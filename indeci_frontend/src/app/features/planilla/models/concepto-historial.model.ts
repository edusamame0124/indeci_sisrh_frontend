import type { ConceptoPlanillaEstado } from './concepto-planilla.model';

/**
 * Historial / versionado de un concepto de planilla
 * (P3 — SPEC_CONCEPTOS_PLANILLA §12 · D5 · D.L. 1451 auditoría).
 *
 * Mirrors `ConceptoHistorialDto` (Java):
 * `GET /api/rrhh/concepto-planilla/{id}/historial` → ApiResponse<ConceptoHistorial>.
 */
export interface ConceptoHistorial {
  /** Versiones por CÓDIGO, normalmente ordenadas por versión descendente. */
  readonly versiones: readonly ConceptoVersionItem[];
  /** Log de auditoría (@Auditable) del concepto, orden descendente por fecha. */
  readonly auditoria: readonly ConceptoAuditoriaItem[];
}

/** Una versión del concepto (fila inmutable por vigencia). */
export interface ConceptoVersionItem {
  readonly id: number;
  readonly version: number;
  /** Inicio de vigencia (ISO `yyyy-MM-dd`) o null. */
  readonly vigIni: string | null;
  /** Fin de vigencia (ISO `yyyy-MM-dd`) o null = abierta. */
  readonly vigFin: string | null;
  readonly estado: ConceptoPlanillaEstado | string;
  /** `true` si es la versión vigente del código. */
  readonly vigente: boolean;
}

/** Un evento de auditoría del concepto. */
export interface ConceptoAuditoriaItem {
  readonly accion: string;
  readonly usuario: string;
  /** Fecha/hora del evento (ISO datetime) tal como la devuelve el backend. */
  readonly fecha: string;
  readonly detalle: string;
}
