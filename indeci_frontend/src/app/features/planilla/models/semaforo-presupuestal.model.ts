/**
 * Spec 012 / C1 · P-05 — Semáforo presupuestal por meta.
 * Espejo de los DTOs Java `SemaforoPresupuestalDto` / `SemaforoMetaDto`.
 */

/** Estado del semáforo: dentro del techo (VERDE) o sobregirado (ROJO). */
export type SemaforoEstado = 'VERDE' | 'ROJO';

/** Fila del semáforo: una meta con su certificado vs lo comprometido. */
export interface SemaforoMeta {
  readonly meta: string;
  readonly centroCosto: string | null;
  readonly fuenteFinanc: string | null;
  /** Empleados de la meta en la planilla del período (PEA). */
  readonly pea: number;
  /** Techo certificado. 0 si la meta aún no tiene certificación cargada. */
  readonly montoCertificado: number;
  /** Suma de netos de la planilla del período para la meta. */
  readonly montoComprometido: number;
  /** montoCertificado − montoComprometido (negativo = sobregiro). */
  readonly saldo: number;
  readonly estado: SemaforoEstado;
}

/** Semáforo presupuestal completo de un período. */
export interface SemaforoPresupuestal {
  readonly periodoId: number;
  readonly periodo: string;
  readonly metas: readonly SemaforoMeta[];
  readonly totalCertificado: number;
  readonly totalComprometido: number;
  readonly estadoGlobal: SemaforoEstado;
}

/** Monto certificado de una meta — entrada del PUT de certificación. */
export interface MetaCertificacionInput {
  readonly meta: string;
  readonly centroCosto: string | null;
  readonly fuenteFinanc: string | null;
  readonly montoCertificado: number;
}
