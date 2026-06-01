/**
 * F3.5 — Modelos del Tablero Consolidado.
 *
 * Espejo de los records Java:
 * {@code ReporteEvolucionDto}, {@code ReporteRegimenDto},
 * {@code ReporteTopConceptosDto}.
 */

// =================== Evolución ===================

export interface ReporteEvolucionItem {
  readonly periodo: string;
  readonly conteoEmpleados: number;
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
  readonly totalNeto: number;
  readonly totalAporteEmpleador: number;
  readonly conteoNetoNoVa: number;
  readonly deltaPctNetoVsAnterior: number | null;
}

export interface ReporteEvolucionResponse {
  readonly periodoBase: string;
  readonly meses: number;
  readonly totalNetoAcumulado: number;
  readonly promedioMensual: number;
  readonly variacionPctRango: number | null;
  readonly items: readonly ReporteEvolucionItem[];
}

// =================== Régimen ===================

export interface ReporteRegimenItem {
  readonly regimenCodigo: string;
  readonly regimenNombre: string;
  readonly conteoEmpleados: number;
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
  readonly totalNeto: number;
  readonly netoPromedio: number;
  readonly porcentajeTotal: number;
}

export interface ReporteRegimenResponse {
  readonly periodo: string;
  readonly totalEmpleados: number;
  readonly totalNeto: number;
  readonly items: readonly ReporteRegimenItem[];
}

// =================== Top Conceptos ===================

export type ConceptoTipoMef =
  | 'REMUNERATIVO'
  | 'NO_REMUNERATIVO'
  | 'DESCUENTO'
  | 'APORTE_TRABAJADOR'
  | 'APORTE_EMPLEADOR';

export interface ReporteTopConceptoItem {
  readonly conceptoPlanillaId: number;
  readonly codigoMef: string | null;
  readonly nombre: string;
  readonly tipoConcepto: ConceptoTipoMef | string | null;
  readonly conteoEmpleados: number;
  readonly montoTotal: number;
  readonly porcentajeIngresos: number;
}

export interface ReporteTopConceptosResponse {
  readonly periodo: string;
  readonly limite: number;
  readonly totalIngresosPeriodo: number;
  readonly items: readonly ReporteTopConceptoItem[];
}
