export interface PlanillaLoteDashboardRow {
  readonly id: number;
  readonly periodo: string;
  readonly regimenLaboralCodigo: string | null;
  readonly tipoPlanilla: string;
  readonly correlativo: number | null;
  readonly estado: string;
  readonly creadoEn: string;
  readonly cantidadEmpleados: number;
  readonly montoTotalNeto: number;
  readonly descripcionConcatenada: string;
}
