import { describe, expect, it } from 'vitest';
import { MAIN_NAV_ITEMS } from '../../../../core/config/main-navigation.config';
import { buildDashboardCards, resolveNavRoute } from './dashboard-nav-cards';

describe('dashboard-nav-cards', () => {
  it('resolveNavRoute usa la primera ruta hija cuando el ítem es agrupador', () => {
    const empleados = MAIN_NAV_ITEMS.find((i) => i.label === 'Empleados');
    expect(empleados).toBeDefined();
    expect(resolveNavRoute(empleados!)).toBe('/empleados/personas');
  });

  it('buildDashboardCards marca accesibles según etiquetas visibles', () => {
    const visible = new Set(['Empleados', 'Planilla']);
    const cards = buildDashboardCards(MAIN_NAV_ITEMS, visible);
    const empleados = cards.find((c) => c.label === 'Empleados');
    const admin = cards.find((c) => c.label === 'Administración');
    expect(empleados?.accessible).toBe(true);
    expect(admin?.accessible).toBe(false);
  });

  it('excluye Inicio del listado de tarjetas', () => {
    const cards = buildDashboardCards(MAIN_NAV_ITEMS, new Set());
    expect(cards.some((c) => c.label === 'Inicio')).toBe(false);
  });
});
