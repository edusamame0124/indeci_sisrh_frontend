import type { AdminAuditoriaRow } from '../models/admin.models';

const CSV_HEADER = ['id', 'fecha', 'usuario', 'accion', 'metodo', 'ip', 'estado', 'userAgent'];

function sanitizeInjectionPrefix(value: string): string {
  const t = value.replace(/\r?\n|\r/g, ' ');
  if (/^[=+\-@\t\r]/.test(t)) return `'${t}`;
  return t;
}

function escapeCsvCell(value: string): string {
  const sanitized = sanitizeInjectionPrefix(value).replace(/"/g, '""');
  return `"${sanitized}"`;
}

/** Genera contenido CSV (UTF-8) con BOM para Excel institucional. */
export function buildAuditoriaCsv(rows: readonly AdminAuditoriaRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    const rowVals = [
      String(r.id),
      r.fecha ?? '',
      r.usuario ?? '',
      r.accion ?? '',
      r.metodo ?? '',
      r.ip ?? '',
      r.estado ?? '',
      r.userAgent ?? '',
    ].map(escapeCsvCell);
    lines.push(rowVals.join(','));
  }
  return `\ufeff${lines.join('\n')}`;
}

export function auditoriaCsvFileName(now: Date): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const t = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  return `auditoria-sisrh-${d}_${t}.csv`;
}
