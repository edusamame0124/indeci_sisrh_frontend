/** Mirrors `MovimientoPlanillaDetalleResponseDto` (Java). */
export interface PlanillaDetalleRow {
  readonly id: number;
  readonly conceptoPlanillaId: number;
  readonly codigoConcepto: string;
  readonly concepto: string;
  /** Legacy TIPO del catálogo: INGRESO | DESCUENTO | APORTE (ESSALUD empleador). */
  readonly tipoConcepto: 'INGRESO' | 'DESCUENTO' | 'APORTE';
  readonly monto: number;
  readonly cantidad: number;
  readonly observacion: string | null;
}
