/** Mirrors `MovimientoPlanillaDetalleResponseDto` (Java). */
export interface PlanillaDetalleRow {
  readonly id: number;
  readonly conceptoPlanillaId: number;
  readonly codigoConcepto: string;
  readonly concepto: string;
  /** TIPO del catálogo: INGRESO | DESCUENTO | APORTE (legacy) o REMUNERATIVO | NO_REMUNERATIVO | RETENCION | RETENCION_TRIBUTARIA | DESCUENTO_JUDICIAL | APORTE_TRABAJADOR | APORTE_EMPLEADOR. */
  readonly tipoConcepto: 'INGRESO' | 'DESCUENTO' | 'APORTE' | 'REMUNERATIVO' | 'NO_REMUNERATIVO' | 'RETENCION' | 'RETENCION_TRIBUTARIA' | 'DESCUENTO_JUDICIAL' | 'APORTE_TRABAJADOR' | 'APORTE_EMPLEADOR' | string;
  readonly monto: number;
  readonly cantidad: number;
  readonly observacion: string | null;
}
