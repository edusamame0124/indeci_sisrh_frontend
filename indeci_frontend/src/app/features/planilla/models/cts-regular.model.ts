export interface CtsRegularGenerarRequest {
  periodo: string;
  regimenLaboralId: number | null;
}

export interface CtsRegularResult {
  exitosos: number;
  fallidos: number;
  total: number;
  mensajes: string[];
}
