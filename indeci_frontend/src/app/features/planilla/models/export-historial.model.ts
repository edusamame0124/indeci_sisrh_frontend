/** Fila del historial de exports XLSX (GET /api/rrhh/planilla/export/historial). */
export interface ExportHistorialRow {
  readonly id: number;
  readonly periodo: string;
  readonly tipoArchivo: string;
  readonly nombreArchivo: string;
  readonly nroLineas: number;
  readonly fechaGenerado: string; // ISO-8601
  readonly hashSha256: string;
}
