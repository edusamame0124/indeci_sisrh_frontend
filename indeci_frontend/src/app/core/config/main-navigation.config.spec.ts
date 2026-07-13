import { describe, expect, it } from 'vitest';

import {
  catalogLeafCount,
  filterNavChildrenByQuery,
  filterVisibleNavItems,
  MAIN_NAV_ITEMS,
} from './main-navigation.config';
import { flattenNavLeaves } from '../models/main-nav-item.model';

describe('filterVisibleNavItems (Spec 009 — 5 módulos + Inicio)', () => {
  it('muestra solo Inicio cuando el usuario no tiene roles', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], []);
    expect(r.map((i) => i.route)).toEqual(['/']);
  });

  it('ADMIN ve todos los módulos (Inicio + Catálogos + Módulo Vinculación + Gestiones del personal + Legajo Personal + Planilla + Reportes + Administración)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Módulo Vinculación',
      'Gestiones del personal',
      'Legajo Personal',
      'Planilla',
      'Reportes',
      'Administración',
      'Portal del empleado',
    ]);
  });

  it('SUPER_ADMIN ve los 5 módulos completos', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['SUPER_ADMIN']);
    expect(r.find((i) => i.label === 'Catálogos')).toBeTruthy();
    expect(r.find((i) => i.label === 'Módulo Vinculación')).toBeTruthy();
    expect(r.find((i) => i.label === 'Planilla')).toBeTruthy();
    expect(r.find((i) => i.label === 'Reportes')).toBeTruthy();
    expect(r.find((i) => i.label === 'Administración')).toBeTruthy();
  });

  it('RRHH_ADMIN (legacy) ve Inicio + Catálogos + Módulo Vinculación + Legajo Personal + Planilla + Portal, NO Reportes ni Administración', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_ADMIN']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Módulo Vinculación',
      'Gestiones del personal',
      'Legajo Personal',
      'Planilla',
      'Portal del empleado',
    ]);
  });

  it('ADMIN_TI ve todos los módulos (soporte TI, sin operación RRHH formal)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN_TI']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Módulo Vinculación',
      'Gestiones del personal',
      'Legajo Personal',
      'Planilla',
      'Reportes',
      'Administración',
      'Portal del empleado',
    ]);
  });

  it('GESTOR_USUARIOS (V012_16) ve SOLO Inicio + Administración, ningún módulo operativo', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['GESTOR_USUARIOS']);
    expect(r.map((i) => i.label)).toEqual(['Inicio', 'Administración']);
  });

  it('PLANILLA_ANALISTA ve Planilla + Reportes, NO Administración', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['PLANILLA_ANALISTA']);
    expect(r.map((i) => i.label)).toContain('Planilla');
    expect(r.map((i) => i.label)).toContain('Reportes');
    expect(r.find((i) => i.label === 'Administración')).toBeUndefined();
  });

  it('RRHH_CONSULTA ve Módulo Vinculación + Legajo Personal + Planilla + Reportes (lectura), NO Administración', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_CONSULTA']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Módulo Vinculación',
      'Gestiones del personal',
      'Legajo Personal',
      'Planilla',
      'Reportes',
      'Portal del empleado',
    ]);
  });

  it('Catálogos agrupa 19 enlaces en 4 sub-expansiones (Conceptos re-hospedado bajo Planilla)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const cat = r.find((i) => i.label === 'Catálogos');
    expect(cat?.children?.length).toBe(4);
    expect(cat?.children?.map((c) => c.label)).toEqual([
      'Referencia',
      'Persona y académico',
      'Organización',
      'Planilla y legal',
    ]);
    expect(catalogLeafCount()).toBe(19);
    const labels = flattenNavLeaves(cat?.children).map((c) => c.label);
    expect(labels).toContain('Bancos');
    // Conceptos de Planilla migró al grupo Planilla (SPEC_CONCEPTOS_PLANILLA §8/D1).
    expect(labels).not.toContain('Conceptos de planilla');
    expect(labels).toContain('Régimen pensionario');
  });

  it('filterNavChildrenByQuery filtra hojas de catálogo por etiqueta', () => {
    const cat = MAIN_NAV_ITEMS.find((i) => i.label === 'Catálogos');
    const filtered = filterNavChildrenByQuery(cat?.children ?? [], 'banco');
    const leaves = flattenNavLeaves(filtered);
    expect(leaves.map((l) => l.label)).toEqual(['Bancos']);
  });

  it('Módulo Vinculación expone 3 sub-items con etiquetas del flujo', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_ADMIN']);
    const emp = r.find((i) => i.label === 'Módulo Vinculación');
    expect(emp?.children?.length).toBe(3);
    expect(emp?.children?.map((c) => c.label)).toEqual([
      'Datos personales',
      'Eventos del período',
      'Ficha 360',
    ]);
  });

  it('Gestiones del personal expone 5 sub-items con PAP_JEFE+PAP_RRHH (3 gestiones + Mis Asistencias + Teletrabajo)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, ['PAP_JEFE', 'PAP_RRHH'], ['ADMIN']);
    const gp = r.find((i) => i.label === 'Gestiones del personal');
    expect(gp?.children?.length).toBe(5);
    expect(gp?.children?.every((c) => !c.comingSoon)).toBe(true);
    expect(gp?.children?.map((c) => c.label)).toEqual([
      'Gestión del empleado',
      'Gestión del jefe inmediato',
      'Gestión de RRHH',
      'Mis Asistencias',
      'Teletrabajo',
    ]);
    const routes = gp?.children?.map((c) => c.route).filter((p): p is string => Boolean(p)) ?? [];
    expect(routes).toEqual([
      '/gestiones-personal/empleado',
      '/gestiones-personal/jefe-inmediato',
      '/gestiones-personal/rrhh',
      '/asistencia-empleado/mis-asistencias',
      '/teletrabajo',
    ]);
  });

  it('EMPLEADO (PAP_EMPLEADO) solo ve Gestión del empleado + Mis Asistencias en Gestiones del personal', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, ['PAP_EMPLEADO'], ['EMPLEADO']);
    const gp = r.find((i) => i.label === 'Gestiones del personal');
    expect(gp?.children?.map((c) => c.label)).toEqual(['Gestión del empleado', 'Mis Asistencias']);
  });

  it('Jefe (PAP_JEFE) ve su gestión pero NO Gestión de RRHH ni Teletrabajo', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, ['PAP_JEFE'], ['JEFE']);
    const gp = r.find((i) => i.label === 'Gestiones del personal');
    expect(gp?.children?.map((c) => c.label)).toEqual([
      'Gestión del empleado',
      'Gestión del jefe inmediato',
      'Mis Asistencias',
    ]);
  });

  it('Legajo Personal expone 1 sub-item navegable bajo /legajo/', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const legajo = r.find((i) => i.label === 'Legajo Personal');
    expect(legajo?.children?.length).toBe(1);
    expect(legajo?.children?.every((c) => !c.comingSoon)).toBe(true);
    const routes = legajo?.children?.map((c) => c.route).filter((p): p is string => Boolean(p)) ?? [];
    expect(routes.every((p) => p.startsWith('/legajo'))).toBe(true);
    expect(routes).toContain('/legajo');
  });

  it('Módulo Vinculación usa rutas bajo /empleados/', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const emp = r.find((i) => i.label === 'Módulo Vinculación');
    const routes = emp?.children?.map((c) => c.route).filter((r): r is string => Boolean(r)) ?? [];
    expect(routes.every((p) => p.startsWith('/empleados/'))).toBe(true);
  });

  it('Spec 009: 16 catálogos extendidos no están comingSoon (Conceptos migró a Planilla)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const cat = r.find((i) => i.label === 'Catálogos');
    const leaves = flattenNavLeaves(cat?.children);
    const extended = leaves.filter((c) => c.route?.startsWith('/catalogos/'));
    const spec009 = extended.filter(
      (c) =>
        c.route &&
        !['/catalogos/bancos', '/catalogos/tipos-cuenta', '/catalogos/ubigeo'].includes(c.route),
    );
    expect(spec009.length).toBe(16);
    expect(spec009.every((c) => !c.comingSoon)).toBe(true);
  });

  it('Planilla expone Centro de Validaciones y Generación masiva/individual como menú directamente', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const pla = r.find((i) => i.label === 'Planilla');
    // 11 ítems de primer nivel: todos directos en planilla.
    expect(pla?.children?.length).toBe(11);
    expect(pla?.children?.map((c) => c.route)).toContain('/planilla/generacion-masiva');
    expect(pla?.children?.map((c) => c.route)).toContain('/planilla/generacion-individual');
    // Todas las rutas navegables (hojas).
    expect(flattenNavLeaves(pla?.children).map((c) => c.route).sort()).toEqual(
      [
        '/planilla/configuracion-cas',
        '/planilla/conceptos',
        '/planilla/periodos',
        '/asistencia/carga',
        '/asistencia/subsidios',
        '/planilla/suspensiones',
        '/planilla/validaciones',
        '/planilla/generacion-masiva',
        '/planilla/generacion-individual',
        '/planilla/movimientos',
        '/planilla/mcpp',
      ].sort(),
    );
  });

  it('Reportes expone 7 sub-items navegables (Boleta se accede desde CTA en /planilla/resumen, no desde sidebar; F3.5 agrega Tablero consolidado)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const rep = r.find((i) => i.label === 'Reportes');
    expect(rep?.children?.length).toBe(7);
    expect(rep?.children?.every((c) => !c.comingSoon)).toBe(true);
    expect(rep?.children?.map((c) => c.route).sort()).toEqual(
      [
        '/reportes/resumen-mensual',
        '/reportes/consolidado',
        '/reportes/resumen-meta',
        '/reportes/conciliacion',
        '/reportes/archivo-bancos',
        '/reportes/exportar-excel',
        '/reportes/historial',
      ].sort(),
    );
  });

  it('Administración preserva 4 sub-items de Spec 007 sin comingSoon', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const adm = r.find((i) => i.label === 'Administración');
    expect(adm?.children?.length).toBe(4);
    expect(adm?.children?.some((c) => c.comingSoon)).toBe(false);
    expect(adm?.children?.map((c) => c.label)).toEqual([
      'Usuarios',
      'Roles',
      'Permisos',
      'Auditoría',
    ]);
  });

  it('Bancos / Tipos de cuenta / Ubigeo no están marcados comingSoon (ya implementados Spec 006)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const cat = r.find((i) => i.label === 'Catálogos');
    const leaves = flattenNavLeaves(cat?.children);
    const banco = leaves.find((c) => c.route === '/catalogos/bancos');
    const tipo = leaves.find((c) => c.route === '/catalogos/tipos-cuenta');
    const ubigeo = leaves.find((c) => c.route === '/catalogos/ubigeo');
    expect(banco?.comingSoon).toBeFalsy();
    expect(tipo?.comingSoon).toBeFalsy();
    expect(ubigeo?.comingSoon).toBeFalsy();
  });

  it('aplica conjunción permiso + rol cuando ambos están definidos', () => {
    const items = [
      ...MAIN_NAV_ITEMS,
      {
        label: 'Ambos',
        route: '/combo',
        icon: 'shield',
        requiredPermissions: ['x'],
        requiredAnyRole: ['ADMIN'],
      },
    ] as const;

    expect(filterVisibleNavItems(items, [], ['ADMIN']).map((i) => i.route)).not.toContain('/combo');
    expect(filterVisibleNavItems(items, ['x'], ['ADMIN']).map((i) => i.route)).toContain('/combo');
  });
});
