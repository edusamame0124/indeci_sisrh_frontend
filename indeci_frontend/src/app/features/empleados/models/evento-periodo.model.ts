/**
 * F3.6 — Modelos TS del módulo Eventos del Período (espejo backend F2.1-2.5 + P0 maternidad).
 */

/** Catálogo {@code INDECI_TIPO_EVENTO}. */
export interface TipoEvento {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly afectaDiasLaborados: string;
  readonly afectaBaseAfp: string;
  readonly afectaBaseEssalud: string;
  readonly generaSubsidio: string;
  readonly requiereAdjunto: string;
  readonly permiteSolape: string;
  readonly codigoPlameSunat: string | null;
  readonly ordenVisual: number;
  readonly activo: number;
}

export type EstadoEvento = 'REGISTRADO' | 'VALIDADO' | 'RECHAZADO';

/** Respuesta paginada de GET /api/rrhh/evento-periodo */
export interface EventoPeriodoPage {
  readonly content: readonly EventoPeriodoResponse[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

export interface EventoPeriodoListParams {
  readonly page: number;
  readonly size: number;
  readonly empleadoId?: number | null;
  readonly tipoEventoId?: number | null;
  readonly estado?: EstadoEvento | null;
}

export interface EventoDistribucionMes {
  readonly periodo: string;
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  readonly diasSubsidio: number;
  readonly afectaDiasLaborados: string;
  readonly estadoTramo: string;
}

export interface MaternidadPreview {
  readonly cruzaMeses: boolean;
  readonly cantidadPeriodos: number;
  readonly codigoPlameSunat: string;
  readonly afectaDiasLaborados: boolean;
  readonly generaSubsidio: boolean;
  readonly sumaAlNeto: boolean;
  readonly mensajeGuardrail: string;
  readonly distribucionMensual: readonly EventoDistribucionMes[];
}

/** Request para crear/actualizar un evento. */
export interface EventoPeriodoRequest {
  readonly empleadoId: number;
  readonly tipoEventoId: number;
  readonly periodo?: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly diasAfectos?: number | null;
  readonly sustentoLegajoDocId?: number | null;
  readonly observacion?: string | null;
  readonly duracionLegal?: number | null;
  readonly motivoExtension?: string | null;
  readonly fechaProbableParto?: string | null;
  readonly difierePrenatalPostnatal?: string | null;
  readonly tipoDocumento?: string | null;
  readonly nroCitt?: string | null;
  readonly fechaEmisionDoc?: string | null;
  readonly distribucionMensual?: readonly EventoDistribucionMes[] | null;
}

/** Response enriquecido con denormalización del catálogo. */
export interface EventoPeriodoResponse {
  readonly id: number;
  readonly empleadoId: number;
  readonly empleadoNombre?: string | null;
  readonly empleadoDni?: string | null;
  readonly tipoEventoId: number;
  readonly tipoEventoCodigo: string | null;
  readonly tipoEventoNombre: string | null;
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
  readonly duracionLegal?: number | null;
  readonly motivoExtension?: string | null;
  readonly fechaProbableParto?: string | null;
  readonly difierePrenatalPostnatal?: string | null;
  readonly tipoDocumento?: string | null;
  readonly nroCitt?: string | null;
  readonly fechaEmisionDoc?: string | null;
  readonly distribucionMensual?: readonly EventoDistribucionMes[] | null;
}
