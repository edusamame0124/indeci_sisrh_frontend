import { describe, expect, it } from 'vitest';
import type { AdminAuditoriaRow } from '../models/admin.models';
import { auditoriaCsvFileName, buildAuditoriaCsv } from './audit-csv-export';

describe('audit-csv-export', () => {
  it('antecede comilla en celdas que podrían ser fórmula', () => {
    const row: AdminAuditoriaRow = {
      id: 1,
      usuario: 'u',
      accion: '=cmd|',
      metodo: 'GET',
      ip: '',
      userAgent: '',
      fecha: '2026-01-01',
      detalle: '',
      estado: 'OK',
    };
    expect(buildAuditoriaCsv([row])).toContain('"\'=cmd|"');
  });

  it('nombre archivo incluye prefijo BOM', () => {
    expect(buildAuditoriaCsv([]).charCodeAt(0)).toBe(0xfeff);
  });

  it('auditoriaCsvFileName tiene patrón estable', () => {
    expect(auditoriaCsvFileName(new Date('2026-05-08T03:05:06'))).toMatch(
      /^auditoria-sisrh-2026-05-08_/,
    );
  });
});
