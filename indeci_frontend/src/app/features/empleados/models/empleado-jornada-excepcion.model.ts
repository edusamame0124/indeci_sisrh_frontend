/** Vigencia calculada por el backend respecto a la fecha de hoy. */
export type EstadoVigenciaHorarioEspecial = 'VIGENTE' | 'FUTURA' | 'VENCIDA';

/** Fila del historial — espejo de EmpleadoJornadaExcepcionResponseDto. */
export interface EmpleadoJornadaExcepcionRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly horaIngreso: string;
  readonly horaSalida: string;
  readonly refrigerioInicio: string | null;
  readonly refrigerioFin: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly documentoAutorizacion: string;
  readonly motivo: string | null;
  readonly estadoVigencia: EstadoVigenciaHorarioEspecial;
}

/** Cuerpo POST/PUT — espejo de EmpleadoJornadaExcepcionDto (backend). */
export interface EmpleadoJornadaExcepcionInput {
  readonly empleadoId: number;
  readonly horaIngreso: string;
  readonly horaSalida: string;
  readonly refrigerioInicio?: string | null;
  readonly refrigerioFin?: string | null;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly documentoAutorizacion: string;
  readonly motivo?: string | null;
}
