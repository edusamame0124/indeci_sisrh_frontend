/** Query GET `/api/rrhh/planilla/incrementos-ds`. */
export interface IncrementosDsQuery {
  readonly regimenLaboralId: number;
  readonly condicionLaboralId?: number | null;
  readonly montoContratado: number;
}

/** Ítem de desglose DS — espejo de `IncrementoDsItemDto`. */
export interface IncrementoDsItem {
  readonly codigoParametro: string;
  readonly etiquetaDs: string;
  readonly montoMensual: number;
}

/** Respuesta preview incrementos DS — espejo de `IncrementosDsResponseDto`. */
export interface IncrementosDsResponse {
  readonly aplica: boolean;
  readonly montoContrato: number;
  readonly incrementos: readonly IncrementoDsItem[];
  readonly totalIncrementos: number;
  readonly remuneracionMensual: number;
}
