/**
 * P0-F3 — Modelos TS del módulo Subsidios (espejo DTOs backend).
 * Base: {@code /api/rrhh/subsidios}.
 */

export type SubsidioTipoCaso = 'ENFERMEDAD' | 'MATERNIDAD';

export type SubsidioEstadoCaso =
  | 'BORRADOR'
  | 'PENDIENTE_VALIDACION'
  | 'CALCULADO'
  | 'APLICADO_PLANILLA'
  | 'EN_TRAMITE_ESSALUD'
  | 'CERRADO';

export type SubsidioModoCalculo = 'OFICIAL' | 'SIMULACION';

export type SubsidioSeveridad = 'BLOQUEO' | 'ALERTA' | 'INFORMATIVA';

export interface SubsidioCasoListParams {
  readonly periodo?: string | null;
  readonly tipo?: SubsidioTipoCaso | null;
  readonly estado?: SubsidioEstadoCaso | null;
  readonly empleadoId?: number | null;
  readonly dni?: string | null;
  readonly page: number;
  readonly size: number;
}

export interface SubsidioCasoPage {
  readonly content: readonly SubsidioCasoResponse[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly page: number;
  readonly size: number;
}

export interface SubsidioCasoRequest {
  readonly empleadoId: number;
  readonly tipoCaso: SubsidioTipoCaso;
  readonly fechaContingencia: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly observacion?: string | null;
  readonly modoCalculo?: SubsidioModoCalculo | null;
}

export interface SubsidioCasoResponse {
  readonly id: number;
  readonly empleadoId: number;
  readonly codigoCaso: string;
  readonly tipoCaso: SubsidioTipoCaso;
  readonly estado: SubsidioEstadoCaso;
  readonly fechaContingencia: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly diasContingencia: number | null;
  readonly versionCaso: number | null;
  readonly reglaVigenciaId: number | null;
  readonly modoCalculo: SubsidioModoCalculo;
  readonly observacion: string | null;
  readonly nombreEmpleado: string | null;
  readonly dniEmpleado: string | null;
  readonly createdAt: string | null;
  readonly citts: readonly SubsidioCittResponse[];
  readonly tramos: readonly SubsidioTramoResponse[];
}

export interface SubsidioCittRequest {
  readonly nroCitt: string;
  readonly fechaEmision: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly tipoDocumento?: string | null;
  readonly hashDocumento?: string | null;
  readonly legajoDocId?: number | null;
  readonly accesoRestringido?: string | null;
}

export interface SubsidioCittResponse {
  readonly id: number;
  readonly casoId: number;
  readonly nroCitt: string;
  readonly fechaEmision: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly estado: string;
  readonly tipoDocumento: string | null;
  readonly accesoRestringido: string;
  readonly createdAt: string | null;
}

export interface SubsidioTramoResponse {
  readonly id: number;
  readonly casoId: number;
  readonly periodo: string;
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  readonly diasSubsidio: number;
  readonly diasLaborados: number;
  readonly estadoTramo: string;
  readonly versionTramo: number;
}

export interface SubsidioBaseDetalle {
  readonly periodo: string;
  readonly remuneracionReal: number;
  readonly topeAplicado: number;
  readonly baseComputable: number;
  readonly fuenteMovimientoId: number | null;
}

export interface SubsidioBaseHistoricaResponse {
  readonly id: number;
  readonly casoId: number;
  readonly mesesEvaluados: number;
  readonly divisorPromedio: number;
  readonly topeMensual: number;
  readonly baseReconocida: number;
  readonly fuente: string;
  readonly versionBase: number;
  readonly createdAt: string | null;
  readonly detalle: readonly SubsidioBaseDetalle[];
}

export interface SubsidioLiquidacionResponse {
  readonly id: number;
  readonly tramoId: number;
  readonly versionLiq: number;
  readonly estado: string;
  readonly contraprestacionDiaria: number;
  readonly contraprestacionEquivalente: number;
  readonly subsidioDiarioEssalud: number;
  readonly subsidioEstimado: number;
  readonly diferencialIndeci: number;
  readonly conciliacionTotal: number;
  readonly formulaAplicada: string | null;
  readonly createdAt: string | null;
}

export interface SubsidioLiquidacionExplicacion {
  readonly liquidacionId: number;
  readonly versionLiq: number;
  readonly reglaVersion: string;
  readonly formulaAplicada: string;
  readonly contraprestacionDiaria: number;
  readonly contraprestacionEquivalente: number;
  readonly subsidioDiarioEssalud: number;
  readonly subsidioEstimado: number;
  readonly diferencialIndeci: number;
  readonly conciliacionTotal: number;
  readonly diasSubsidio: number;
  readonly diasLaborados: number;
  readonly tipoCaso: SubsidioTipoCaso;
  readonly snapshotJson: string | null;
}

export interface SubsidioTimelineEvento {
  readonly id: number;
  readonly tipoEvento: string;
  readonly descripcion: string;
  readonly usuario: string | null;
  readonly createdAt: string;
}

export interface SubsidioValidacion {
  readonly codigo: string;
  readonly severidad: SubsidioSeveridad;
  readonly mensaje: string;
  readonly casoId: number | null;
  readonly tramoId: number | null;
  readonly liquidacionId: number | null;
}

export interface SubsidioCalculoPaso {
  readonly orden: number;
  readonly concepto: string;
  readonly formula: string;
  readonly valor: string;
}
