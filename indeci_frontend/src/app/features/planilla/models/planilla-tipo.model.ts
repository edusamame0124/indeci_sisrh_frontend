/**
 * Tipo de planilla / cédula (CAS, CAS TEMPORAL, CAS ADICIONAL, …).
 * Mirrors `PlanillaTipoDto` (Java).
 * Fuente: SPEC_CONCEPTOS_PLANILLA §15 (Fase A — 2026-06-24).
 *
 * <p>Catálogo administrable (la entidad agrega más; relación M:N con el
 * concepto). En Fase A es metadata/clasificación: NO filtra la generación del
 * motor (eso llega en Fase B).</p>
 */
export interface PlanillaTipo {
  /** Código del tipo de planilla (PK). Ej.: `CAS`, `CAS_TEMP`. */
  readonly codigo: string;
  /** Nombre legible mostrado en chips y selectores. Ej.: `CAS TEMPORAL`. */
  readonly nombre: string;
  readonly descripcion?: string;
  /** Orden de presentación (ascendente). */
  readonly orden: number;
  readonly activo: number;
}

/** Payload para crear/editar. */
export interface PlanillaTipoInput {
  readonly codigo?: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly orden?: number;
  readonly activo: number;
}
