/**
 * Presentación de asistencia — fuente única de verdad para traducir el código interno
 * TIPO_DIA (INDECI_ASISTENCIA_DETALLE, CHECK INDECI_ASIST_DET_TIPO_CK) a su etiqueta oficial
 * ante el empleado. El código interno (ej. "LABORAL") nunca debe mostrarse tal cual en
 * pantalla ni en documentos impresos — ver el enum espejo `TipoDiaAsistencia` en el backend
 * (com.indeci.rrhh.service.asistencia), que usa el mismo texto para el PDF oficial.
 *
 * Vive en `shared/` porque lo consumen 2+ features (asistencia, asistencia-empleado) sin
 * relación de dependencia entre sí.
 */

/** Etiqueta es-PE oficial por código TIPO_DIA. */
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
  OMISION_MARCACION: 'Omisión de marca',
  ASISTENCIA_JUSTIFICADA: 'Justificada',
};

/** Etiqueta es-PE de la condición (tipoDia) para mostrar al usuario. */
export function condicionLabel(tipo: string | null | undefined): string {
  if (!tipo) return '—';
  return CONDICION_LABELS[tipo] ?? tipo;
}

/** Clase del badge de condición según el tipo de día. */
export function badgeClass(tipo: string | null | undefined): string {
  switch (tipo) {
    case 'LABORAL':
    case 'TELETRABAJO':
    case 'ASISTENCIA_JUSTIFICADA': // omisión ya cubierta por papeleta 004 → verde
      return 'diaria__badge diaria__badge--ok';
    case 'TARDANZA':
      return 'diaria__badge diaria__badge--warn';
    case 'FALTA':
    case 'SANCION_PAD':
    case 'OBSERVADO': // requiere acción de RR.HH. (autorizar/no autorizar, o revisar salida anticipada)
    case 'OMISION_MARCACION': // RIS INDECI Art. 25.5: es inasistencia — mismo tratamiento que Falta
      // (sigue mostrándose como "Omisión de marca" para trazabilidad; ver condicionLabel).
      return 'diaria__badge diaria__badge--danger';
    case 'PERMISO':
    case 'LICENCIA':
      return 'diaria__badge diaria__badge--info';
    case 'VACACIONES':
      return 'diaria__badge diaria__badge--vacaciones';
    default:
      return 'diaria__badge';
  }
}

/** Color del punto identificador de la condición (mismo criterio semántico que {@link badgeClass}). */
export function condicionDotColor(tipo: string | null | undefined): string {
  switch (tipo) {
    case 'LABORAL':
    case 'TELETRABAJO':
    case 'ASISTENCIA_JUSTIFICADA':
      return '#1b5e20';
    case 'TARDANZA':
      return '#e65100';
    case 'FALTA':
    case 'SANCION_PAD':
    case 'OBSERVADO':
    case 'OMISION_MARCACION':
      return '#b71c1c';
    case 'PERMISO':
    case 'LICENCIA':
      return '#0d47a1';
    case 'VACACIONES':
      return '#4527a0';
    default:
      return '#64748b';
  }
}

/** Formatea minutos como "1h 20m" / "45m" / "—" (para tardanza, salida anticipada, etc.). */
export function fmtMin(value: number | null | undefined): string {
  if (value == null || value <= 0) return '—';
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
