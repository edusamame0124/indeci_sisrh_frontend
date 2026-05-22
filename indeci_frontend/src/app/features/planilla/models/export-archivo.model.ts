/**
 * B3 / M09 — Log de archivos PLAME/MCPP generados.
 * Espejo de la entidad Java `ExportArchivo` (V010_29).
 */
export interface ExportArchivoRow {
  readonly id: number;
  /** "YYYY-MM". */
  readonly periodo: string;
  /** PLAME_REM | PLAME_JOR | PLAME_SNL | MCPP_01 | MCPP_03 | MCPP_12. */
  readonly tipoArchivo: string;
  readonly nombreArchivo: string;
  readonly hashSha256: string;
  readonly nroLineas: number;
  readonly totalIngresos: number | null;
  readonly totalDescuentos: number | null;
  readonly generadoPor: number | null;
  /** ISO timestamp. */
  readonly fechaGenerado: string;
  readonly nroTicketMcpp: string | null;
}
