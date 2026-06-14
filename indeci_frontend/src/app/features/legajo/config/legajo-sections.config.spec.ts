import { describe, expect, it } from 'vitest';
import { LEGAJO_DEFAULT_SECTION_ROUTE, LEGAJO_SECTIONS } from './legajo-sections.config';

describe('LEGAJO_SECTIONS', () => {
  it('define exactamente 11 secciones', () => {
    expect(LEGAJO_SECTIONS).toHaveLength(11);
  });

  it('tiene ids, labels y rutas no vacíos', () => {
    for (const section of LEGAJO_SECTIONS) {
      expect(section.id.trim().length).toBeGreaterThan(0);
      expect(section.label.trim().length).toBeGreaterThan(0);
      expect(section.route.trim().length).toBeGreaterThan(0);
      expect(section.icon.trim().length).toBeGreaterThan(0);
    }
  });

  it('tiene rutas e ids únicos', () => {
    const routes = LEGAJO_SECTIONS.map((s) => s.route);
    const ids = LEGAJO_SECTIONS.map((s) => s.id);
    expect(new Set(routes).size).toBe(routes.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa la primera sección como ruta por defecto', () => {
    expect(LEGAJO_DEFAULT_SECTION_ROUTE).toBe('datos-generales');
  });
});
