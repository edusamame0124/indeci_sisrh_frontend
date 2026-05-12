/** Cuerpo POST/PUT — espejo de `EmpleadoPlanillaDto` (backend). */
export interface EmpleadoPlanillaInput {
  readonly empleadoId: number;
  readonly sueldoBasico: number;
  readonly movilidad?: number;
  readonly alimentacion?: number;
  readonly tieneAsignacionFamiliar?: number;
  readonly numHijos?: number;
  readonly descuentoBanco?: number;
  readonly descuentoInstitucion?: number;
}

/** Fila listado — espejo de `EmpleadoPlanillaResponseDto`. */
export interface EmpleadoPlanillaRow {
  readonly id: number;
  readonly sueldoBasico: number;
  readonly movilidad: number | null;
  readonly alimentacion: number | null;
  readonly tieneAsignacionFamiliar: number | null;
  readonly numHijos: number | null;
  readonly activo: number;
}
