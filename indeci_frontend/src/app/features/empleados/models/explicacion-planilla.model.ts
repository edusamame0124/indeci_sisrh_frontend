/**
 * F3.1 — Modelo TS espejo del backend `ExplicacionPlanillaDto`.
 *
 * Alimenta la Ficha 360 del Empleado: cabecera de identificación, 6 KPI
 * cards superiores y desglose línea por línea para el tab "Cálculo
 * detallado" con el botón "Explicar cálculo".
 */

/** Una línea individual del desglose ("¿de dónde sale este monto?"). */
export interface ExplicacionLinea {
  /** "INGRESO" | "DESCUENTO" | "APORTE_TRABAJADOR" | "APORTE_EMPLEADOR" | "INFO". */
  readonly grupo: string;
  readonly conceptoPlanillaId: number | null;
  readonly codigoMef: string | null;
  readonly codigoSisper: string | null;
  readonly descripcion: string;
  readonly monto: number;
  /** Texto humano breve: "30 días", "10 % RMV", "Reintegro 5 días". */
  readonly detalle: string | null;
  readonly observacion: string | null;
  /** "CONCEPTO_AUTO" | "EMPLEADO_CONCEPTO" | "ASISTENCIA" | "PARAMETRO" | null. */
  readonly fuenteTipo: string | null;
  readonly fuenteId: number | null;
}

/** Bloque de identificación que va en el header de Ficha 360. */
export interface ExplicacionCabecera {
  readonly nombreCompleto: string | null;
  readonly dni: string | null;
  readonly regimenLaboralCodigo: string | null;
  readonly regimenLaboralNombre: string | null;
  readonly meta: string | null;
  readonly banco: string | null;
  readonly numeroCuenta: string | null;
  readonly cci: string | null;
}

/** KPIs que van en las 6 cards superiores. */
export interface ExplicacionTotales {
  readonly totalIngresos: number | null;
  readonly totalDescuentos: number | null;
  readonly aporteTrabajador: number;
  readonly aporteEmpleador: number;
  readonly netoPagar: number | null;
  /** 'BIEN' | 'NETO_NO_VA'. */
  readonly estadoNeto: string | null;
  readonly neto50pctMinimo: number | null;
  readonly montoSistemaAirhsp: number | null;
  readonly montoAirhsp: number | null;
  readonly diferenciaAirhsp: number | null;
  /** 'CONCILIADO' | 'PENDIENTE' | null si no hay AIRHSP cargado. */
  readonly estadoAirhsp: string | null;
}

/** Respuesta completa del endpoint `/explicacion/{periodo}`. */
export interface ExplicacionPlanilla {
  readonly aplica: boolean;
  readonly empleadoId: number;
  readonly periodo: string;
  readonly cabecera: ExplicacionCabecera | null;
  readonly totales: ExplicacionTotales | null;
  readonly lineas: readonly ExplicacionLinea[];
}
