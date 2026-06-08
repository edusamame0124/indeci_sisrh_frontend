import type { EventoDistribucionMes, MaternidadPreview } from '../models/evento-periodo.model';

export type DuracionLegalMaternidad = 98 | 128;
export type MotivoExtensionMaternidad = 'NACIMIENTO_MULTIPLE' | 'NINO_DISCAPACIDAD';
export type DifierePrenatalPostnatal = 'NO' | 'PARCIAL' | 'TOTAL';
export type TipoDocumentoMaternidad = 'CITT' | 'CERT_MEDICO' | 'RESOLUCION' | 'OTRO';

const PLAME_MATERNIDAD = '0915';

export function normalizarDuracionLegal(
  value: number | string | null | undefined,
): DuracionLegalMaternidad | null {
  const n = Number(value);
  return n === 98 || n === 128 ? n : null;
}

export function calcularFechaFinMaternidad(
  fechaInicio: Date,
  duracionLegal: DuracionLegalMaternidad | number | string,
): Date {
  const dias = normalizarDuracionLegal(duracionLegal) ?? Number(duracionLegal);
  const fin = new Date(fechaInicio);
  fin.setDate(fin.getDate() + dias - 1);
  return fin;
}

export function calcularDistribucionMensual(
  fechaInicio: Date,
  fechaFin: Date,
): EventoDistribucionMes[] {
  const tramos: EventoDistribucionMes[] = [];
  let cursor = startOfDay(fechaInicio);
  const fin = startOfDay(fechaFin);

  while (cursor.getTime() <= fin.getTime()) {
    const finMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const tramoHasta = fin.getTime() < finMes.getTime() ? fin : finMes;
    const dias = diffDays(cursor, tramoHasta) + 1;
    const periodo = `${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, '0')}`;

    tramos.push({
      periodo,
      fechaDesde: toIso(cursor),
      fechaHasta: toIso(tramoHasta),
      diasSubsidio: dias,
      afectaDiasLaborados: 'S',
      estadoTramo: 'PENDIENTE_IMPUTACION',
    });

    const siguiente = new Date(tramoHasta);
    siguiente.setDate(siguiente.getDate() + 1);
    cursor = siguiente;
  }
  return tramos;
}

export function construirPreviewMaternidad(
  fechaInicio: Date,
  duracionLegal: DuracionLegalMaternidad,
): MaternidadPreview {
  const fechaFin = calcularFechaFinMaternidad(fechaInicio, duracionLegal);
  const distribucionMensual = calcularDistribucionMensual(fechaInicio, fechaFin);
  const cruzaMeses = distribucionMensual.length > 1;

  return {
    cruzaMeses,
    cantidadPeriodos: distribucionMensual.length,
    codigoPlameSunat: PLAME_MATERNIDAD,
    afectaDiasLaborados: true,
    generaSubsidio: true,
    sumaAlNeto: !cruzaMeses,
    mensajeGuardrail: cruzaMeses
      ? 'Este descanso cruza varios meses. El sistema lo distribuirá automáticamente por periodo. La imputación del subsidio al neto se aplicará periodo a periodo en una versión posterior.'
      : 'El descanso queda dentro de un solo periodo de planilla.',
    distribucionMensual,
  };
}

export function formatearPeriodo(periodo: string): string {
  if (periodo.length !== 6) return periodo;
  return `${periodo.slice(0, 4)}-${periodo.slice(4)}`;
}

export function formatearFechaEs(fechaIso: string): string {
  const [y, m, d] = fechaIso.split('-');
  return `${d}/${m}/${y}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
