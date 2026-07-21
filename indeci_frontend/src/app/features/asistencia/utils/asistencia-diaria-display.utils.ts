import { CONDICION_LABELS } from '../models/asistencia-diaria.model';

/**
 * Helpers de presentación de la asistencia diaria, compartidos por la consulta diaria y el
 * detalle de importación (DRY). Funciones puras — sin estado ni dependencias de Angular.
 */

/** Etiqueta es-PE de la condición (tipoDia) para la columna "Condición". */
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
    case 'OMISION_MARCACION': // pendiente de papeleta 004 → naranja (warning, no fatal)
      return 'diaria__badge diaria__badge--warn';
    case 'FALTA':
    case 'SANCION_PAD':
      return 'diaria__badge diaria__badge--danger';
    case 'PERMISO':
    case 'LICENCIA':
      return 'diaria__badge diaria__badge--info';
    default:
      return 'diaria__badge';
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
