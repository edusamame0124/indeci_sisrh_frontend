export type TipoCobertura = 'ESSALUD' | 'ESSALUD_EPS';
export type EstadoSaludEps = 'ACTIVO' | 'CERRADO' | 'INACTIVO' | 'ANULADO';

export interface EpsItem {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface EmpleadoSaludEpsRow {
  id: number;
  empleadoId: number;
  tipoCobertura: TipoCobertura;
  epsId: number | null;
  epsNombre: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoSaludEps;
  documentoSustento: string | null;
  observacion: string | null;
  motivoAnulacion: string | null;
  anuladoPor: string | null;
  anuladoEn: string | null;
  creadoPor: string;
  creadoEn: string;
  modificadoPor: string | null;
  modificadoEn: string | null;
}

export interface EmpleadoSaludEpsInput {
  tipoCobertura: TipoCobertura;
  epsId: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  documentoSustento: string | null;
  observacion: string | null;
}

export interface EmpleadoSaludEpsAnularInput {
  motivo: string;
}
