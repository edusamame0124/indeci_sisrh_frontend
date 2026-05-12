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
}
