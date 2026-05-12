/** Cuerpo POST — espejo de `EmpleadoPuestoDto`. */
export interface EmpleadoPuestoInput {
  readonly empleadoId: number;
  readonly cargo: string;
  readonly nivelId?: number;
  readonly sedeId?: number;
  readonly oficinaId?: number;
  readonly jefeId?: number;
}

/** Fila listado — espejo de `EmpleadoPuestoResponseDto`. */
export interface EmpleadoPuestoRow {
  readonly id: number;
  readonly cargo: string;
  readonly nivelId: number | null;
  readonly sedeId: number | null;
  readonly oficinaId: number | null;
  readonly jefeId: number | null;
  readonly activo: number;
}
