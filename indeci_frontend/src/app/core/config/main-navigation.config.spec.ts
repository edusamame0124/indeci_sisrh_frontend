import { describe, expect, it } from 'vitest';

import { filterVisibleNavItems, MAIN_NAV_ITEMS } from './main-navigation.config';

describe('filterVisibleNavItems', () => {
  it('muestra Inicio y oculta Personas sin rol RRHH', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], []);
    expect(r.map((i) => i.route)).toEqual(['/']);
  });

  it('muestra Personas cuando el rol es ADMIN', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['ADMIN']);
    expect(r.filter((x) => x.route === '').map((x) => x.label)).toEqual([
      'Catálogos',
      'Administración',
    ]);

    expect(r.map((i) => i.route)).toEqual([
      '/',
      '/rrhh/personas',
      '/rrhh/cuentas-bancarias',
      '/rrhh/pension',
      '/rrhh/planilla',
      '/rrhh/puesto',
      '',
      '',
    ]);
    const cat = r.find((i) => i.label === 'Catálogos');
    expect(cat?.children?.length).toBe(3);
    const adm = r.find((i) => i.label === 'Administración');
    expect(adm?.children?.length).toBe(4);
  });

  it('muestra RRHH Catálogos y Administración con SUPER_ADMIN', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['SUPER_ADMIN']);
    expect(r.find((i) => i.label === 'Administración')).toBeTruthy();
    expect(r.find((i) => i.label === 'Catálogos')).toBeTruthy();
    expect(r.map((i) => i.route)).toContain('/');
  });

  it('muestra Personas cuando el rol es RRHH_ADMIN', () => {
    const r = filterVisibleNavItems(MAIN_NAV_ITEMS, [], ['RRHH_ADMIN']);
    expect(r.map((i) => i.route)).toEqual([
      '/',
      '/rrhh/personas',
      '/rrhh/cuentas-bancarias',
      '/rrhh/pension',
      '/rrhh/planilla',
      '/rrhh/puesto',
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
        requiredAnyRole: ['ADMIN'],
      },
    ] as const;

    expect(
      filterVisibleNavItems(items, [], ['ADMIN']).map((i) => i.route),
    ).not.toContain('/combo');
    expect(filterVisibleNavItems(items, ['x'], ['ADMIN']).map((i) => i.route)).toContain('/combo');
  });
});
