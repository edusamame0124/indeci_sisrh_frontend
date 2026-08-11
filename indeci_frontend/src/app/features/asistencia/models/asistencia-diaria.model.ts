import type { SpringPage } from './asistencia-import.model';
import type { TipoDia } from './asistencia.model';

/** Fila de consulta diaria de asistencia (espejo de AsistenciaDiariaRowDto). */
export interface AsistenciaDiariaRow {
  readonly detalleId: number;
  readonly cabeceraId: number;
  /** Lote que originó la cabecera activa. Null si la asistencia se cargó manualmente. */
  readonly importacionId: number | null;
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
  // Horario Especial vigente ese día (INDECI_EMPLEADO_JORNADA_EXCEPCION).
  readonly tieneHorarioEspecial?: boolean;
  readonly horarioEspecialIngreso?: string | null;
  readonly horarioEspecialSalida?: string | null;
}

export interface AsistenciaDiariaFiltro {
  readonly fechaInicio: string;
  /** Opcional: si se omite, se consulta un solo día (= fechaInicio). */
  readonly fechaFin?: string;
  readonly dni?: string;
  readonly q?: string;
  /** Solo filas cuyo día cae dentro de un Horario Especial vigente para ese empleado. */
  readonly soloHorarioEspecial?: boolean;
  /** Condiciones (TIPO_DIA) a incluir; vacío/omitido = todas. */
  readonly tiposDia?: readonly string[];
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
