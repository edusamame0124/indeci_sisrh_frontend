/**
 * Proyección ligera para listados (GET /api/rrhh/persona y /persona/page).
 * Solo los campos que necesitan la tabla y los hubs de selección.
 */
export interface PersonaResumen {
  readonly id: number;
  readonly empleadoId?: number | null;
  readonly nombreCompleto: string;
  readonly dni?: string | null;
  readonly codigoInterno?: string | null;
  readonly estado?: string | null;
  readonly regimenLaboral?: string | null;
  readonly ruc?: string | null;
  readonly estadoCivil?: string | null;
  readonly profesion?: string | null;
  readonly gradoAcademico?: string | null;
}

/** Respuesta paginada de GET /api/rrhh/persona/page */
export interface PersonaPage {
  readonly content: readonly PersonaResumen[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

/** Aligned with backend `PersonaEmpleadoResponseDto` (may include empleado nullable fields). */
export interface PersonaEmpleado {
  readonly id: number;
  /** Backend `empleadoId`; required for banco/pension APIs. */
  readonly empleadoId?: number | null;
  readonly nombreCompleto: string;
  readonly dni?: string | null;
  readonly ruc?: string | null;
  readonly email?: string | null;
  readonly telefono?: string | null;
  readonly direccion?: string | null;
  readonly distritoId?: string | null;
  readonly codigoInterno?: string | null;
  readonly estado?: string | null;
  readonly fechaNacimiento?: string | null;
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
  /** Código del régimen laboral vigente (CAS, 728, 276, SERVIR). FASE1. */
  readonly regimenLaboral?: string | null;

  readonly contactoEmergenciaNombre?: string | null;
  readonly contactoEmergenciaParentesco?: string | null;
  readonly contactoEmergenciaTelefono?: string | null;

  readonly correoInstitucional?: string | null;
  readonly fotoPerfil?: string | null;

  readonly tipoPersonalId?: number | null;
  readonly tipoPersonal?: string | null;
}
export interface MiPerfilUpdateInput {
  telefono: string | null;
  correoPersonal: string | null;
  direccion: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaParentesco: string | null;
  contactoEmergenciaTelefono: string | null;
}
/** Body POST/PUT alineado a `PersonaEmpleadoDto` (camelCase). */
export interface PersonaEmpleadoInput {
  nombreCompleto: string;
  dni: string;
  ruc?: string;
  email: string;
  telefono: string;
  direccion: string;
  distritoId: string;
  codigoInterno: string;
  estado: string;
  fechaNacimiento: string | null;
  // ===== Spec 009 / T134 — IDs nullable mapeados a Long en backend =====
  sexoId: number | null;
  estadoCivilId: number | null;
  tipoDocumentoId: number | null;
  profesionId: number | null;
  gradoAcademicoId: number | null;
}
