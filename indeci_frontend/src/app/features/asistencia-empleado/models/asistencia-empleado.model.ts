export interface ApiResponse<T> {
  estado: string;
  mensaje: string;
  data: T;
}

export interface MiAsistenciaEmpleado {
  id?: number;
  empleadoId?: number;
  fecha: string;

  estado?: string | null;
  estadoAsistencia?: string | null;
  tipo?: string | null;

  horaIngreso?: string | null;
  horaSalida?: string | null;

  minutosTardanza?: number | null;
  tardanzaMinutos?: number | null;

  montoDescuento?: number | null;
  descuento?: number | null;

  observacion?: string | null;
}

export type EstadoDiaAsistenciaEmpleado =
  | 'LABORAL'
  | 'TARDANZA'
  | 'FALTA'
  | 'LICENCIA'
  | 'VACACIONES'
  | 'DESCANSO'
  | 'FERIADO'
  | 'OBSERVADO'
  | 'SIN_REGISTRO';

export interface DiaCalendarioAsistenciaEmpleado {
  fecha: string;
  dia: number;
  mesActual: boolean;
  estado: EstadoDiaAsistenciaEmpleado;
  asistencia?: MiAsistenciaEmpleado | null;
}