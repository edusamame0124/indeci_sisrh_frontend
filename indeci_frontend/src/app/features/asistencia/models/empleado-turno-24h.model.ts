/** Vigencia calculada por el backend respecto a la fecha de hoy. */
export type EstadoVigenciaTurno24h = 'VIGENTE' | 'FUTURA' | 'VENCIDA';

/** Fila del listado — espejo de EmpleadoTurno24hResponseDto. */
export interface EmpleadoTurno24hRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly documentoAutorizacion: string;
  readonly motivo: string | null;
  readonly estadoVigencia: EstadoVigenciaTurno24h;
}

/** Cuerpo POST/PUT — espejo de EmpleadoTurno24hDto (backend). */
export interface EmpleadoTurno24hInput {
  readonly empleadoId: number;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly documentoAutorizacion: string;
  readonly motivo?: string | null;
}
