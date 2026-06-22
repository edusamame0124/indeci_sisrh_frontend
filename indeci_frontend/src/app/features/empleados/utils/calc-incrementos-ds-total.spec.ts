import { describe, expect, it } from 'vitest';
import { calcIncrementosDsTotal } from './calc-incrementos-ds-total';

describe('calcIncrementosDsTotal', () => {
  it('calcula diferencia cuando sueldoBasico=4864.19 y montoContrato=4500', () => {
    expect(calcIncrementosDsTotal(4864.19, 4500)).toBe(364.19);
  });

  it('retorna 0 cuando no hay incrementos', () => {
    expect(calcIncrementosDsTotal(4500, 4500)).toBe(0);
  });

  it('retorna null si montoContrato es null (registro legacy)', () => {
    expect(calcIncrementosDsTotal(4864.19, null)).toBeNull();
  });

  it('retorna null si sueldoBasico es null', () => {
    expect(calcIncrementosDsTotal(null, 4500)).toBeNull();
  });
});
