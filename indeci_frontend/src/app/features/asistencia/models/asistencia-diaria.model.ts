import type { SpringPage } from './asistencia-import.model';
import type { TipoDia } from './asistencia.model';

/** Fila de consulta diaria de asistencia (espejo de AsistenciaDiariaRowDto). */
export interface AsistenciaDiariaRow {
  readonly detalleId: number;
  readonly cabeceraId: number;
  readonly empleadoId: number;
  readonly dni: string | null;
  readonly nombreCompleto: string | null;
  readonly fecha: string;
  readonly marcaEntrada: string | null;
  readonly marcaSalida: string | null;
  readonly tipoDia: TipoDia | string;
  readonly horasTrabajadasMin: number | null;
  readonly minutosSalidaAnticipada: number | null;
  readonly periodo: string;
  readonly origen: string | null;
  readonly minutosTardanza: number | null;
  readonly observacion: string | null;
  readonly marca3: string | null;
  readonly marca4: string | null;
  readonly horaEntradaEsperada: string | null;
  readonly horasExtra25Min: number | null;
  readonly horasExtra35Min: number | null;
  readonly horasExtra100Min: number | null;
  readonly horasExtraTotalMin: number | null;
  // Permiso / Papeleta aprobada que cubre el día (INDECI_SOLICITUD_RRHH, estado 9).
  readonly tienePapeletaAprobada: boolean;
  readonly papeletaTipo: string | null;
  readonly papeletaMotivo: string | null;
  readonly papeletaHoraInicio: string | null;
  readonly papeletaHoraFin: string | null;
  readonly papeletaCantidadHoras: number | null;
  readonly papeletaAutorizada: number | null;
  readonly papeletaMotivoRechazo: string | null;
  readonly papeletaDecisionUsuario: string | null;
  readonly papeletaDecisionFecha: string | null;
  readonly tieneTeletrabajo?: boolean;
}

export interface AsistenciaDiariaFiltro {
  readonly fecha: string;
  readonly dni?: string;
  readonly q?: string;
  readonly page?: number;
  readonly size?: number;
}

export interface AsistenciaDiariaEditInput {
  readonly tipoDia?: TipoDia | string;
  readonly marcaEntrada?: string | null;
  readonly marcaSalida?: string | null;
  readonly minutosTardanza?: number | null;
  readonly observacion?: string | null;
  readonly papeletaAutorizada?: boolean | null;
  readonly papeletaMotivoRechazo?: string | null;
}

export type AsistenciaDiariaPage = SpringPage<AsistenciaDiariaRow>;

/** Etiquetas es-PE para tipoDia en la columna Condición. */
export const CONDICION_LABELS: Record<string, string> = {
  LABORAL: 'Presente',
  TARDANZA: 'Tardío',
  FALTA: 'Falto',
  LICENCIA: 'Licencia',
  VACACIONES: 'Vacaciones',
  DESCANSO: 'Descanso',
  FERIADO: 'Feriado',
  OBSERVADO: 'Observado',
  SANCION_PAD: 'Sanción PAD',
  TELETRABAJO: 'Teletrabajo',
  PERMISO: 'Permiso c/goce',
};
