/**
 * F3.6 — Modelos TS del módulo Eventos del Período (espejo backend F2.1-2.5).
 *
 * Cubre: catálogo de tipos de evento (10 tipos sembrados V010_43),
 * registros transaccionales y formas request/response del CRUD.
 */

/** Catálogo {@code INDECI_TIPO_EVENTO}. */
export interface TipoEvento {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  /** S/N — el evento resta días del default 30 (motor PASO 3). */
  readonly afectaDiasLaborados: string;
  readonly afectaBaseAfp: string;
  readonly afectaBaseEssalud: string;
  /** S/N — el evento dispara SubsidioCalculadorService (F2.4). */
  readonly generaSubsidio: string;
  /** S/N — el service exige sustentoLegajoDocId al crear. */
  readonly requiereAdjunto: string;
  /** S/N — admite coexistir con otro evento (lactancia parcial sobre maternidad). */
  readonly permiteSolape: string;
  readonly codigoPlameSunat: string | null;
  readonly ordenVisual: number;
  readonly activo: number;
}

/** Estados válidos de {@code INDECI_EMPLEADO_EVENTO}. */
export type EstadoEvento = 'REGISTRADO' | 'VALIDADO' | 'RECHAZADO';

/** Request para crear/actualizar un evento. */
export interface EventoPeriodoRequest {
  readonly empleadoId: number;
  readonly tipoEventoId: number;
  readonly periodo?: string | null;
  readonly fechaInicio: string; // ISO yyyy-MM-dd
  readonly fechaFin: string;
  readonly diasAfectos?: number | null;
  readonly sustentoLegajoDocId?: number | null;
  readonly observacion?: string | null;
}

/** Response enriquecido con denormalización del catálogo. */
export interface EventoPeriodoResponse {
  readonly id: number;
  readonly empleadoId: number;
  readonly tipoEventoId: number;
  readonly tipoEventoCodigo: string | null;
  readonly tipoEventoNombre: string | null;
  /** S/N. UI muestra link "Ver subsidio proyectado" cuando es S. */
  readonly generaSubsidio: string | null;
  readonly requiereAdjunto: string | null;
  readonly periodo: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly diasAfectos: number | null;
  readonly sustentoLegajoDocId: number | null;
  readonly observacion: string | null;
  readonly estado: EstadoEvento;
  readonly createdAt: string;
  readonly createdBy: string | null;
}
