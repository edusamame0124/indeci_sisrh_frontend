import { describe, expect, it } from 'vitest';
import {
  ADMIN_MODULE_ACCESS_ROLES,
  ASISTENCIA_ACCESS_ROLES,
  AUTOSERVICIO_ROLES,
  CATALOGOS_ACCESS_ROLES,
  CATALOGOS_WRITE_ROLES,
  GESTIONES_PERSONAL_ROLES,
  hasAnyRole,
  PLANILLA_APPROVE_ROLES,
  PLANILLA_FULL_ROLES,
  PLANILLA_MENU_ROLES,
  REPORTES_ACCESS_ROLES,
  TI_ALL_ROLES,
  VINCULACION_ACCESS_ROLES,
} from './sisrh-roles.config';

describe('sisrh-roles.config (RBAC V012_45)', () => {
  it('SUPER_ADMIN es el único rol técnico', () => {
    expect(TI_ALL_ROLES).toEqual(['SUPER_ADMIN']);
  });

  it('los roles retirados no aparecen en ningún conjunto', () => {
    const retirados = [
      'ADMIN',
      'ADMIN_TI',
      'PLANILLA_ANALISTA',
      'PLANILLA_APROBADOR',
      'RRHH_JEFE',
      'RRHH_ANALISTA',
      'RRHH_CONSULTA',
    ];
    const conjuntos = [
      ADMIN_MODULE_ACCESS_ROLES,
      ASISTENCIA_ACCESS_ROLES,
      CATALOGOS_ACCESS_ROLES,
      CATALOGOS_WRITE_ROLES,
      GESTIONES_PERSONAL_ROLES,
      PLANILLA_FULL_ROLES,
      PLANILLA_MENU_ROLES,
      REPORTES_ACCESS_ROLES,
      VINCULACION_ACCESS_ROLES,
    ];
    for (const conjunto of conjuntos) {
      for (const retirado of retirados) {
        expect(conjunto as readonly string[]).not.toContain(retirado);
      }
    }
  });

  it('PLANILLA es el único rol funcional con acceso pleno a planilla', () => {
    expect(PLANILLA_FULL_ROLES).toEqual(['SUPER_ADMIN', 'PLANILLA']);
    expect(PLANILLA_APPROVE_ROLES).toEqual(['SUPER_ADMIN', 'PLANILLA']);
  });

  it('ASISTENCIA entra al menú de Planilla pero no a su alcance pleno', () => {
    expect(PLANILLA_MENU_ROLES as readonly string[]).toContain('ASISTENCIA');
    expect(PLANILLA_FULL_ROLES as readonly string[]).not.toContain('ASISTENCIA');
  });

  it('VINCULACION es el único rol funcional de Vinculación y Legajo', () => {
    expect(VINCULACION_ACCESS_ROLES).toEqual(['SUPER_ADMIN', 'VINCULACION']);
    expect(VINCULACION_ACCESS_ROLES as readonly string[]).not.toContain('PLANILLA');
  });

  it('Catálogos: PLANILLA lee pero no escribe; RRHH_ADMIN hace ambas', () => {
    expect(CATALOGOS_ACCESS_ROLES as readonly string[]).toContain('PLANILLA');
    expect(CATALOGOS_WRITE_ROLES as readonly string[]).not.toContain('PLANILLA');
    expect(CATALOGOS_WRITE_ROLES as readonly string[]).toContain('RRHH_ADMIN');
  });

  it('Reportes lo comparten PLANILLA y RRHH_ADMIN', () => {
    expect(hasAnyRole(['PLANILLA'], REPORTES_ACCESS_ROLES)).toBe(true);
    expect(hasAnyRole(['RRHH_ADMIN'], REPORTES_ACCESS_ROLES)).toBe(true);
    expect(hasAnyRole(['VINCULACION'], REPORTES_ACCESS_ROLES)).toBe(false);
    expect(hasAnyRole(['ASISTENCIA'], REPORTES_ACCESS_ROLES)).toBe(false);
  });

  it('RRHH_ADMIN queda acotado a Catálogos y Reportes', () => {
    expect(hasAnyRole(['RRHH_ADMIN'], PLANILLA_FULL_ROLES)).toBe(false);
    expect(hasAnyRole(['RRHH_ADMIN'], PLANILLA_MENU_ROLES)).toBe(false);
    expect(hasAnyRole(['RRHH_ADMIN'], VINCULACION_ACCESS_ROLES)).toBe(false);
    expect(hasAnyRole(['RRHH_ADMIN'], ADMIN_MODULE_ACCESS_ROLES)).toBe(false);
  });

  it('autoservicio es exclusivo del rol EMPLEADO', () => {
    expect(AUTOSERVICIO_ROLES).toEqual(['EMPLEADO']);
    expect(hasAnyRole(['JEFE'], AUTOSERVICIO_ROLES)).toBe(false);
    expect(hasAnyRole(['RRHH_PAPELETA'], AUTOSERVICIO_ROLES)).toBe(false);
  });

  it('Gestiones del personal es de los roles del portal', () => {
    expect(GESTIONES_PERSONAL_ROLES).toEqual(['EMPLEADO', 'JEFE', 'RRHH_PAPELETA']);
    expect(hasAnyRole(['PLANILLA'], GESTIONES_PERSONAL_ROLES)).toBe(false);
  });

  it('Administración solo TI + GESTOR_USUARIOS', () => {
    expect(ADMIN_MODULE_ACCESS_ROLES).toEqual(['SUPER_ADMIN', 'GESTOR_USUARIOS']);
  });
});
