export interface ApiResponse<T> {
  estado?: string;
  mensaje?: string;
  data: T;
}

export interface TeletrabajoCatalogo {
  id: number;
  codigo?: string | null;
  nombre: string;
  activo?: number;
}

export interface TeletrabajoResumen {
  id: number;
  empleadoId: number;

  trabajador?: string | null;
  nombreCompleto?: string | null;
  empleado?: string | null;
  nombreEmpleado?: string | null;

  dni?: string | null;
  cargo?: string | null;
  regimenLaboral?: string | null;

  mes: number;
  anio: number;
  modalidadId?: number | null;
  modalidad?: string | null;
  fechaReporte?: string | null;
  estado?: string | null;
  activo?: number;
}

export interface TeletrabajoReporte {
  id: number;
  empleadoId: number;
  mes: number;
  anio: number;
  modalidadId?: number | null;
  modalidad?: string | null;
  fechaReporte?: string | null;
  estado?: string | null;
  detalles: TeletrabajoDetalle[];
}

export interface TeletrabajoDetalle {
  id: number;
  nroOrden?: number | null;
  actividadProgramada?: string | null;
  actividadEjecutada?: string | null;
  medioVerificacion?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  estadoCumplimientoId?: number | null;
  estadoCumplimiento?: string | null;
  porcentajeAvance?: number | null;
  incidenciaObservacion?: string | null;
  conformidadId?: number | null;
  conformidad?: string | null;
}

export interface CrearTeletrabajoCabeceraRequest {
  empleadoId: number;
  mes: number;
  anio: number;
  modalidadId: number;
  fechaReporte: string;
}

export interface GuardarTeletrabajoDetalleRequest {
  reporteId: number;
  nroOrden?: number | null;
  actividadProgramada: string;
  actividadEjecutada: string;
  medioVerificacion?: string | null;
  fechaInicio: string;
  fechaFin: string;
  estadoCumplimientoId: number;
  porcentajeAvance: number;
  incidenciaObservacion?: string | null;
  conformidadId: number;
}

export interface TeletrabajoTrabajadorItem {
  id?: number; // personaId
  empleadoId?: number;
  personaId?: number;
  nombreCompleto?: string | null;
  trabajador?: string | null;
  dni?: string | null;
  codigoInterno?: string | null;
  estado?: string | null;
  cargo?: string | null;
  regimenLaboral?: string | null;
}

export interface TeletrabajoPersonaPage {
  content: TeletrabajoTrabajadorItem[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}
