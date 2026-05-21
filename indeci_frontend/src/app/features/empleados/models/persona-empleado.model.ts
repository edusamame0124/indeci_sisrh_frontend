/** Aligned with backend `PersonaEmpleadoResponseDto` (may include empleado nullable fields). */
export interface PersonaEmpleado {
  readonly id: number;
  /** Backend `empleadoId`; required for banco/pension APIs. */
  readonly empleadoId?: number | null;
  readonly nombreCompleto: string;
  readonly dni: string;
  readonly email: string;
  readonly telefono?: string | null;
  readonly direccion?: string | null;
  readonly distritoId?: string | null;
  readonly codigoInterno?: string | null;
  readonly estado?: string | null;
  // ===== Spec 009 / T134 — catálogos demográficos y académicos (nullable) =====
  readonly sexoId?: number | null;
  readonly sexo?: string | null;
  readonly estadoCivilId?: number | null;
  readonly estadoCivil?: string | null;
  readonly tipoDocumentoId?: number | null;
  readonly tipoDocumento?: string | null;
  readonly profesionId?: number | null;
  readonly profesion?: string | null;
  readonly gradoAcademicoId?: number | null;
  readonly gradoAcademico?: string | null;
}

/** Body POST/PUT alineado a `PersonaEmpleadoDto` (camelCase). */
export interface PersonaEmpleadoInput {
  nombreCompleto: string;
  dni: string;
  email: string;
  telefono: string;
  direccion: string;
  distritoId: string;
  codigoInterno: string;
  estado: string;
  // ===== Spec 009 / T134 — IDs nullable mapeados a Long en backend =====
  sexoId: number | null;
  estadoCivilId: number | null;
  tipoDocumentoId: number | null;
  profesionId: number | null;
  gradoAcademicoId: number | null;
}
