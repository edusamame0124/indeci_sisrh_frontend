import { describe, expect, it } from 'vitest';
import {
  ADMIN_MODULE_ACCESS_ROLES,
  CATALOGOS_WRITE_ROLES,
  EMPLEADOS_ACCESS_ROLES,
  hasAnyRole,
  REPORTES_ACCESS_ROLES,
  TI_ALL_ROLES,
} from './sisrh-roles.config';

describe('sisrh-roles.config (Fase 1)', () => {
  it('roles TI no incluyen roles RRHH operativos', () => {
    for (const ti of TI_ALL_ROLES) {
      expect(['PLANILLA_ANALISTA', 'RRHH_ANALISTA']).not.toContain(ti);
    }
  });

  it('ADMIN_MODULE solo TI', () => {
    expect(ADMIN_MODULE_ACCESS_ROLES).toContain('SUPER_ADMIN');
    expect(ADMIN_MODULE_ACCESS_ROLES).toContain('ADMIN_TI');
    expect(ADMIN_MODULE_ACCESS_ROLES).not.toContain('RRHH_JEFE');
  });

  it('CATALOGOS_WRITE solo TI', () => {
    expect(CATALOGOS_WRITE_ROLES.every((r) => TI_ALL_ROLES.includes(r as (typeof TI_ALL_ROLES)[number]))).toBe(
      true,
    );
  });

  it('PLANILLA_ANALISTA accede empleados y reportes', () => {
    expect(hasAnyRole(['PLANILLA_ANALISTA'], EMPLEADOS_ACCESS_ROLES)).toBe(true);
    expect(hasAnyRole(['PLANILLA_ANALISTA'], REPORTES_ACCESS_ROLES)).toBe(true);
    expect(hasAnyRole(['PLANILLA_ANALISTA'], ADMIN_MODULE_ACCESS_ROLES)).toBe(false);
  });

  it('RRHH_CONSULTA no accede administración', () => {
    expect(hasAnyRole(['RRHH_CONSULTA'], ADMIN_MODULE_ACCESS_ROLES)).toBe(false);
    expect(hasAnyRole(['RRHH_CONSULTA'], EMPLEADOS_ACCESS_ROLES)).toBe(true);
  });
});
