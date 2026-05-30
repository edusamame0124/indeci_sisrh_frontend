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

  it('ADMIN ve todos los módulos (Inicio + Catálogos + Empleados + Gestiones del personal + Planilla + Portal + Reportes + Administración)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Empleados',
      'Gestiones del personal',
      'Planilla',
      'Portal del empleado',
      'Reportes',
      'Administración',
    ]);
  });

  it('SUPER_ADMIN ve los 5 módulos completos', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['SUPER_ADMIN']);
    expect(r.find((i) => i.label === 'Catálogos')).toBeTruthy();
    expect(r.find((i) => i.label === 'Empleados')).toBeTruthy();
    expect(r.find((i) => i.label === 'Planilla')).toBeTruthy();
    expect(r.find((i) => i.label === 'Reportes')).toBeTruthy();
    expect(r.find((i) => i.label === 'Administración')).toBeTruthy();
  });

  it('RRHH_ADMIN (legacy) ve Inicio + Catálogos + Empleados + Planilla + Portal, NO Reportes ni Administración', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_ADMIN']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Empleados',
      'Gestiones del personal',
      'Planilla',
      'Portal del empleado',
    ]);
  });

  it('ADMIN_TI ve todos los módulos (soporte TI, sin operación RRHH formal)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN_TI']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Empleados',
      'Gestiones del personal',
      'Planilla',
      'Portal del empleado',
      'Reportes',
      'Administración',
    ]);
  });

  it('PLANILLA_ANALISTA ve Planilla + Reportes, NO Administración', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['PLANILLA_ANALISTA']);
    expect(r.map((i) => i.label)).toContain('Planilla');
    expect(r.map((i) => i.label)).toContain('Reportes');
    expect(r.find((i) => i.label === 'Administración')).toBeUndefined();
  });

  it('RRHH_CONSULTA ve Empleados + Planilla + Reportes (lectura), NO Administración', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_CONSULTA']);
    expect(r.map((i) => i.label)).toEqual([
      'Inicio',
      'Catálogos',
      'Empleados',
      'Gestiones del personal',
      'Planilla',
      'Portal del empleado',
      'Reportes',
    ]);
  });

  it('Catálogos agrupa 20 enlaces en 4 sub-expansiones (Fase 5)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const cat = r.find((i) => i.label === 'Catálogos');
    expect(cat?.children?.length).toBe(4);
    expect(cat?.children?.map((c) => c.label)).toEqual([
      'Referencia',
      'Persona y académico',
      'Organización',
      'Planilla y legal',
    ]);
    expect(catalogLeafCount()).toBe(20);
    const labels = flattenNavLeaves(cat?.children).map((c) => c.label);
    expect(labels).toContain('Bancos');
    expect(labels).toContain('Conceptos de planilla');
    expect(labels).toContain('Régimen pensionario');
  });

  it('filterNavChildrenByQuery filtra hojas de catálogo por etiqueta', () => {
    const cat = MAIN_NAV_ITEMS.find((i) => i.label === 'Catálogos');
    const filtered = filterNavChildrenByQuery(cat?.children ?? [], 'banco');
    const leaves = flattenNavLeaves(filtered);
    expect(leaves.map((l) => l.label)).toEqual(['Bancos']);
  });

  it('Empleados expone 8 sub-items con etiquetas del flujo (Spec 009 + B5)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_ADMIN']);
    const emp = r.find((i) => i.label === 'Empleados');
    expect(emp?.children?.length).toBe(8);
    expect(emp?.children?.map((c) => c.label)).toEqual([
      'Datos personales',
      'Puesto laboral',
      'Cuenta bancaria',
      'Configuración pensión',
      'Configuración planilla',
      'Conceptos asignados',
      'Préstamos',
      'Vacaciones',
    ]);
  });

  it('Gestiones del personal expone 3 sub-items navegables bajo /gestiones-personal/', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const gp = r.find((i) => i.label === 'Gestiones del personal');
    expect(gp?.children?.length).toBe(3);
    expect(gp?.children?.every((c) => !c.comingSoon)).toBe(true);
    expect(gp?.children?.map((c) => c.label)).toEqual([
      'Gestión del empleado',
      'Gestión del jefe inmediato',
      'Gestión de RRHH',
    ]);
    const routes = gp?.children?.map((c) => c.route).filter((p): p is string => Boolean(p)) ?? [];
    expect(routes).toEqual([
      '/gestiones-personal/empleado',
      '/gestiones-personal/jefe-inmediato',
      '/gestiones-personal/rrhh',
    ]);
  });

  it('Empleados usa rutas bajo /empleados/ (T131)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const emp = r.find((i) => i.label === 'Empleados');
    const routes = emp?.children?.map((c) => c.route).filter((r): r is string => Boolean(r)) ?? [];
    expect(routes.every((p) => p.startsWith('/empleados/'))).toBe(true);
  });

  it('Spec 009: 17 catálogos extendidos no están comingSoon (rutas T129)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const cat = r.find((i) => i.label === 'Catálogos');
    const leaves = flattenNavLeaves(cat?.children);
    const extended = leaves.filter((c) => c.route?.startsWith('/catalogos/'));
    const spec009 = extended.filter(
      (c) =>
        c.route &&
        !['/catalogos/bancos', '/catalogos/tipos-cuenta', '/catalogos/ubigeo'].includes(c.route),
    );
    expect(spec009.length).toBe(17);
    expect(spec009.every((c) => !c.comingSoon)).toBe(true);
  });

  it('Conceptos asignados (Empleados) no está comingSoon tras T143', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const emp = r.find((i) => i.label === 'Empleados');
    const conceptos = emp?.children?.find((c) => c.route === '/empleados/conceptos');
    expect(conceptos?.comingSoon).toBeFalsy();
  });

  it('Planilla expone 5 sub-items navegables (Detalle/Resumen/Cierre se acceden desde Movimientos y Periodos, no desde sidebar)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const pla = r.find((i) => i.label === 'Planilla');
    expect(pla?.children?.length).toBe(5);
    expect(pla?.children?.every((c) => !c.comingSoon)).toBe(true);
    expect(pla?.children?.map((c) => c.route).sort()).toEqual(
      [
        '/planilla/periodos',
        '/asistencia/carga',
        '/planilla/generacion-masiva',
        '/planilla/generacion-individual',
        '/planilla/movimientos',
      ].sort(),
    );
  });

  it('Reportes expone 6 sub-items navegables (Boleta se accede desde CTA en /planilla/resumen, no desde sidebar)', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    const rep = r.find((i) => i.label === 'Reportes');
    expect(rep?.children?.length).toBe(6);
    expect(rep?.children?.every((c) => !c.comingSoon)).toBe(true);
    expect(rep?.children?.map((c) => c.route).sort()).toEqual(
      [
        '/reportes/resumen-mensual',
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
