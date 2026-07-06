/** Track B — Solicitud de generación del AGUINALDO (proceso aparte). */
export interface AguinaldoRequest {
  readonly periodo: string;
  /** % manual de RR.HH. para CAS (0..100). */
  readonly pctCas: number | null;
  /** Fecha de corte de elegibilidad (ISO yyyy-MM-dd). */
  readonly fechaCorte: string | null;
  /** Filtro opcional por régimen laboral. */
  readonly regimenLaboralId: number | null;
}

export interface AguinaldoExcluido {
  readonly empleadoId: number;
  readonly motivo: string;
}

/** Resultado: generados + excluidos (auditoría) + advertencias no bloqueantes (#A). */
export interface AguinaldoResult {
  readonly generados: number;
  readonly excluidos: readonly AguinaldoExcluido[];
  readonly advertencias: readonly string[];
}
