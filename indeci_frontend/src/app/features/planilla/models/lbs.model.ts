export interface LbsGenerarRequest {
  periodo: string;
  regimenLaboralId: number | null;
}

export interface LbsResult {
  exitosos: number;
  total: number;
  fallidos: Array<{
    empleadoId: number;
    razon: string;
  }>;
}
