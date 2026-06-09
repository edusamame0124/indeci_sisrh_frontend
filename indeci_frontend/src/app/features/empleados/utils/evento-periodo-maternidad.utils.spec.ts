import { describe, expect, it } from 'vitest';
import {
  calcularDistribucionMensual,
  calcularFechaFinMaternidad,
  construirPreviewMaternidad,
  normalizarDuracionLegal,
} from './evento-periodo-maternidad.utils';

describe('evento-periodo-maternidad.utils', () => {
  it('normaliza duracion desde string del mat-radio', () => {
    expect(normalizarDuracionLegal('98')).toBe(98);
    expect(normalizarDuracionLegal('128')).toBe(128);
    expect(normalizarDuracionLegal(96)).toBeNull();
  });

  it('calcula fecha fin 98 dias (+97)', () => {
    const inicio = new Date(2026, 4, 1);
    const fin = calcularFechaFinMaternidad(inicio, 98);
    expect(fin.getFullYear()).toBe(2026);
    expect(fin.getMonth()).toBe(7);
    expect(fin.getDate()).toBe(6);
  });

  it('distribuye 98 dias en varios meses', () => {
    const inicio = new Date(2026, 4, 5);
    const fin = calcularFechaFinMaternidad(inicio, 98);
    const tramos = calcularDistribucionMensual(inicio, fin);
    expect(tramos.length).toBeGreaterThan(1);
    expect(tramos.reduce((s, t) => s + t.diasSubsidio, 0)).toBe(98);
  });

  it('preview indica cruza meses y no suma al neto', () => {
    const inicio = new Date(2026, 4, 5);
    const preview = construirPreviewMaternidad(inicio, 98);
    expect(preview.cruzaMeses).toBe(true);
    expect(preview.sumaAlNeto).toBe(false);
    expect(preview.codigoPlameSunat).toBe('0915');
  });

  it('preview mismo mes suma al neto', () => {
    const inicio = new Date(2026, 4, 1);
    const preview = construirPreviewMaternidad(inicio, 98);
    expect(preview.cruzaMeses).toBe(true);
  });
});
