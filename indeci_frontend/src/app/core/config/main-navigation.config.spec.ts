import { describe, expect, it } from 'vitest';

import {
  catalogLeafCount,
  filterNavChildrenByQuery,
  filterVisibleNavItems,
  MAIN_NAV_ITEMS,
} from './main-navigation.config';
import { flattenNavLeaves } from '../models/main-nav-item.model';

/** Etiquetas visibles para un rol (sin permisos granulares). */
const labelsFor = (rol: string, permisos: string[] = []) =>
  filterVisibleNavItems(MAIN_NAV_ITEMS, permisos, [rol]).map((i) => i.label);

describe('filterVisibleNavItems — matriz RBAC V012_45', () => {
  it('muestra solo Inicio cuando el usuario no tiene roles', () => {
    expect(filterVisibleNavItems(MAIN_NAV_ITEMS, [], []).map((i) => i.route)).toEqual(['/']);
  });

  it('SUPER_ADMIN ve todos los módulos operativos', () => {
    const labels = labelsFor('SUPER_ADMIN');
    expect(labels).toEqual([
      'Inicio',
      'Catálogos',
      'Módulo Vinculación',
      'Legajo Personal',
      'Planilla',
      'Reportes',
      'Administración',
    ]);
  });

  it('PLANILLA ve Catálogos, Planilla y Reportes — nunca Vinculación ni Administración', () => {
    const labels = labelsFor('PLANILLA');
    expect(labels).toEqual(['Inicio', 'Catálogos', 'Planilla', 'Reportes']);
    expect(labels).not.toContain('Módulo Vinculación');
    expect(labels).not.toContain('Legajo Personal');
    expect(labels).not.toContain('Administración');
  });

  it('VINCULACION ve solo Módulo Vinculación y Legajo Personal', () => {
    const labels = labelsFor('VINCULACION');
    expect(labels).toEqual(['Inicio', 'Módulo Vinculación', 'Legajo Personal']);
    expect(labels).not.toContain('Planilla');
    expect(labels).not.toContain('Reportes');
    expect(labels).not.toContain('Catálogos');
  });

  it('ASISTENCIA ve Planilla con SOLO 2 de los 10 hijos', () => {
    const items = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ASISTENCIA']);
    expect(items.map((i) => i.label)).toEqual(['Inicio', 'Planilla']);

    const planilla = items.find((i) => i.label === 'Planilla');
    expect(planilla?.children?.map((c) => c.route)).toEqual([
      '/planilla/periodos',
      '/asistencia/carga',
    ]);
  });

  it('ASISTENCIA no alcanza generación, movimientos, MCPP ni subsidios', () => {
    const items = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ASISTENCIA']);
    const rutas = flattenNavLeaves(items.find((i) => i.label === 'Planilla')?.children).map(
      (c) => c.route,
    );
    expect(rutas).not.toContain('/planilla/generacion-masiva');
    expect(rutas).not.toContain('/planilla/movimientos');
    expect(rutas).not.toContain('/planilla/mcpp');
    expect(rutas).not.toContain('/asistencia/subsidios');
    expect(rutas).not.toContain('/planilla/conceptos');
  });

  it('PLANILLA sí ve los 10 hijos del módulo', () => {
    const planilla = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['PLANILLA']).find(
      (i) => i.label === 'Planilla',
    );
    expect(planilla?.children?.length).toBe(10);
    expect(planilla?.children?.map((c) => c.route)).toContain('/asistencia/subsidios');
    expect(planilla?.children?.map((c) => c.route)).toContain('/planilla/mcpp');
  });

  it('RRHH_ADMIN queda acotado a Catálogos y Reportes', () => {
    expect(labelsFor('RRHH_ADMIN')).toEqual(['Inicio', 'Catálogos', 'Reportes']);
  });

  it('GESTOR_USUARIOS ve SOLO Inicio + Administración', () => {
    expect(labelsFor('GESTOR_USUARIOS')).toEqual(['Inicio', 'Administración']);
  });

  it('Mi perfil y Mi legajo son exclusivos del rol EMPLEADO', () => {
    const empleado = labelsFor('EMPLEADO', ['PAP_EMPLEADO']);
    expect(empleado).toContain('Mi perfil');
    expect(empleado).toContain('Mi legajo');

    for (const rol of ['SUPER_ADMIN', 'PLANILLA', 'VINCULACION', 'ASISTENCIA', 'RRHH_ADMIN']) {
      expect(labelsFor(rol)).not.toContain('Mi perfil');
      expect(labelsFor(rol)).not.toContain('Mi legajo');
    }
  });

  it('Gestiones del personal es de los roles del portal, no de los operativos', () => {
    expect(labelsFor('EMPLEADO', ['PAP_EMPLEADO'])).toContain('Gestiones del personal');
    expect(labelsFor('JEFE', ['PAP_JEFE'])).toContain('Gestiones del personal');
    expect(labelsFor('RRHH_PAPELETA', ['PAP_RRHH'])).toContain('Gestiones del personal');

    for (const rol of ['SUPER_ADMIN', 'PLANILLA', 'VINCULACION', 'ASISTENCIA', 'RRHH_ADMIN']) {
      expect(labelsFor(rol, ['PAP_JEFE', 'PAP_RRHH'])).not.toContain('Gestiones del personal');
    }
  });

  it('EMPLEADO solo ve Gestión del empleado + Mis Asistencias', () => {
    const gp = filterVisibleNavItems(MAIN_NAV_ITEMS, ['PAP_EMPLEADO'], ['EMPLEADO']).find(
      (i) => i.label === 'Gestiones del personal',
    );
    expect(gp?.children?.map((c) => c.label)).toEqual(['Gestión del empleado', 'Mis Asistencias']);
  });

  it('JEFE (PAP_JEFE) suma su gestión pero no la de RRHH ni Teletrabajo', () => {
    const gp = filterVisibleNavItems(MAIN_NAV_ITEMS, ['PAP_JEFE'], ['JEFE']).find(
      (i) => i.label === 'Gestiones del personal',
    );
    expect(gp?.children?.map((c) => c.label)).toEqual([
      'Gestión del empleado',
      'Gestión del jefe inmediato',
      'Mis Asistencias',
    ]);
  });

  it('RRHH_PAPELETA (PAP_RRHH) ve Gestión de RRHH y Teletrabajo', () => {
    const gp = filterVisibleNavItems(MAIN_NAV_ITEMS, ['PAP_RRHH'], ['RRHH_PAPELETA']).find(
      (i) => i.label === 'Gestiones del personal',
    );
    const labels = gp?.children?.map((c) => c.label) ?? [];
    expect(labels).toContain('Gestión de RRHH');
    expect(labels).toContain('Teletrabajo');
  });

  it('los roles retirados no ven ningún módulo', () => {
    for (const rol of [
      'ADMIN',
      'ADMIN_TI',
      'PLANILLA_ANALISTA',
      'PLANILLA_APROBADOR',
      'RRHH_JEFE',
      'RRHH_ANALISTA',
      'RRHH_CONSULTA',
    ]) {
      expect(labelsFor(rol)).toEqual(['Inicio']);
    }
  });

  it('Catálogos agrupa 19 enlaces en 4 sub-expansiones', () => {
    const cat = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['SUPER_ADMIN']).find(
      (i) => i.label === 'Catálogos',
    );
    expect(cat?.children?.length).toBe(4);
    expect(cat?.children?.map((c) => c.label)).toEqual([
      'Referencia',
      'Persona y académico',
      'Organización',
      'Planilla y legal',
    ]);
    expect(catalogLeafCount()).toBe(19);
  });

  it('filterNavChildrenByQuery filtra hojas de catálogo por etiqueta', () => {
    const cat = MAIN_NAV_ITEMS.find((i) => i.label === 'Catálogos');
    const leaves = flattenNavLeaves(filterNavChildrenByQuery(cat?.children ?? [], 'banco'));
    expect(leaves.map((l) => l.label)).toEqual(['Bancos']);
  });

  it('Módulo Vinculación expone 3 sub-items bajo /empleados/', () => {
    const emp = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['VINCULACION']).find(
      (i) => i.label === 'Módulo Vinculación',
    );
    expect(emp?.children?.map((c) => c.label)).toEqual([
      'Datos personales',
      'Eventos del período',
      'Ficha 360',
    ]);
    const rutas = emp?.children?.map((c) => c.route).filter((r): r is string => Boolean(r)) ?? [];
    expect(rutas.every((p) => p.startsWith('/empleados/'))).toBe(true);
  });

  it('Reportes expone 7 sub-items navegables', () => {
    const rep = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['PLANILLA']).find(
      (i) => i.label === 'Reportes',
    );
    expect(rep?.children?.length).toBe(7);
    expect(rep?.children?.every((c) => !c.comingSoon)).toBe(true);
  });

  it('Administración preserva sus 4 sub-items', () => {
    const adm = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['GESTOR_USUARIOS']).find(
      (i) => i.label === 'Administración',
    );
    expect(adm?.children?.map((c) => c.label)).toEqual([
      'Usuarios',
      'Roles',
      'Permisos',
      'Auditoría',
    ]);
  });

  it('aplica conjunción permiso + rol cuando ambos están definidos', () => {
    const items = [
      ...MAIN_NAV_ITEMS,
      {
        label: 'Ambos',
        route: '/combo',
        icon: 'shield',
        requiredPermissions: ['x'],
        requiredAnyRole: ['SUPER_ADMIN'],
      },
    ] as const;

    expect(filterVisibleNavItems(items, [], ['SUPER_ADMIN']).map((i) => i.route)).not.toContain(
      '/combo',
    );
    expect(filterVisibleNavItems(items, ['x'], ['SUPER_ADMIN']).map((i) => i.route)).toContain(
      '/combo',
    );
  });
});
