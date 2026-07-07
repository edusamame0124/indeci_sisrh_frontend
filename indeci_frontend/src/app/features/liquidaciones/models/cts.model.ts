/**
 * Feature 016 — Modelos de Liquidación de CTS Trunca.
 * Reflejan 1:1 los DTOs del backend (com.indeci.rrhh.dto.cts). Principio III.
 */

export type CtsEstado = 'PENDIENTE' | 'CALCULADO' | 'CERRADO' | 'BLOQUEADO';

export interface CtsCandidato {
  readonly empleadoId: number;
  readonly empleadoPlanillaId: number;
  readonly dni: string | null;
  readonly nombre: string | null;
  readonly regimenCodigo: string | null;
  readonly fechaCese: string | null;
  readonly motivoCese: string | null;
  readonly estado: CtsEstado;
  readonly aptoParaCalcular: boolean;
  readonly bloqueoMotivo: string | null;
}

export interface CtsLiquidacionResponse {
  readonly id: number;
  readonly empleadoId: number;
  readonly empleadoPlanillaId: number;
  readonly periodo: string;
  readonly regimenCodigo: string;
  readonly estrategia: string;
  readonly fechaIngreso: string;
  readonly fechaCese: string;
  readonly anios: number;
  readonly meses: number;
  readonly dias: number;
  readonly baseComputable: number;
  readonly montoAnios: number;
  readonly montoFraccion: number;
  readonly montoTotal: number;
  readonly estado: CtsEstado;
}

export interface CtsConceptoExcluido {
  readonly concepto: string;
  readonly monto: number;
}

export interface CtsDesglose {
  readonly id: number;
  readonly dni: string | null;
  readonly nombre: string | null;
  readonly regimenCodigo: string;
  readonly estrategia: string;
  readonly fechaIngreso: string;
  readonly fechaCese: string;
  readonly anios: number;
  readonly meses: number;
  readonly dias: number;
  readonly diasFraccion: number;
  readonly baseComputable: number;
  readonly factorAnual: number;
  readonly divisorDias: number;
  readonly excluidos: readonly CtsConceptoExcluido[];
  readonly montoAnios: number;
  readonly montoFraccion: number;
  readonly montoTotal: number;
  readonly formula: string;
  readonly marcoNormativo: string;
  readonly estado: CtsEstado;
}

export interface CtsCalcularRequest {
  readonly empleadoId: number;
  readonly empleadoPlanillaId: number;
  readonly periodo: string;
}
