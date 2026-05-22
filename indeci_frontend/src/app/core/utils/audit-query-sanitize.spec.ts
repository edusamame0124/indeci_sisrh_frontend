import { describe, expect, it } from 'vitest';
import {
  sanitizeAuditAccionFilter,
  sanitizeAuditIpFilter,
  sanitizeAuditUsuarioFilter,
} from './audit-query-sanitize';

describe('audit-query-sanitize', () => {
  it('recorta y elimina control chars en usuario', () => {
    const v = `a\u0000${'x'.repeat(200)}`;
    expect(sanitizeAuditUsuarioFilter(v).length).toBe(128);
    expect(sanitizeAuditUsuarioFilter(v)).not.toContain('\u0000');
  });

  it('recorta IP', () => {
    expect(sanitizeAuditIpFilter('  10.0.0.1 ')).toBe('10.0.0.1');
    const long = `${'1'.repeat(100)}`;
    expect(sanitizeAuditIpFilter(long).length).toBe(64);
  });

  it('acción sin saltos de línea', () => {
    expect(sanitizeAuditAccionFilter('LOGIN\nDROP')).toBe('LOGINDROP');
  });
});
