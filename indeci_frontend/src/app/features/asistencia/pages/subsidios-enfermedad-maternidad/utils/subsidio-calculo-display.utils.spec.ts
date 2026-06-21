import { describe, expect, it } from 'vitest';
import {
  buildPasosCalculo,
  formatSubsidioMonto,
  labelEstadoCaso,
  labelEstadoLiquidacion,
  labelSeveridadValidacion,
  labelTipoCaso,
  tienePermisoSubsidio,
} from './subsidio-calculo-display.utils';
import type { SubsidioLiquidacionExplicacion } from '../models/subsidio.models';

describe('subsidio-calculo-display.utils', () => {
  it('formatea montos en soles', () => {
    expect(formatSubsidioMonto(1234.5)).toContain('1');
    expect(formatSubsidioMonto(null)).toBe('—');
  });

  it('traduce tipo y estado de caso', () => {
    expect(labelTipoCaso('MATERNIDAD')).toContain('Maternidad');
    expect(labelEstadoCaso('BORRADOR')).toBe('Borrador');
  });

  it('construye pasos de cálculo explicado', () => {
    const exp: SubsidioLiquidacionExplicacion = {
      liquidacionId: 1,
      versionLiq: 1,
      reglaVersion: 'Regla v2026.1',
      formulaAplicada: 'SUBSIDIO_V1',
      contraprestacionDiaria: 100,
      contraprestacionEquivalente: 3000,
      subsidioDiarioEssalud: 80,
      subsidioEstimado: 2400,
      diferencialIndeci: 600,
      conciliacionTotal: 3000,
      diasSubsidio: 30,
      diasLaborados: 0,
      tipoCaso: 'MATERNIDAD',
      snapshotJson: null,
    };
    const pasos = buildPasosCalculo(exp);
    expect(pasos).toHaveLength(6);
    expect(pasos[0].concepto).toContain('Contraprestación diaria');
  });

  it('traduce severidad y estado de liquidación', () => {
    expect(labelSeveridadValidacion('BLOQUEO')).toBe('Bloqueo');
    expect(labelEstadoLiquidacion('APLICADO_PLANILLA')).toBe('Aplicado a planilla');
  });

  it('reconoce permisos SUB_* y SUPER_ADMIN', () => {
    expect(tienePermisoSubsidio(['SUB_READ'], 'SUB_READ')).toBe(true);
    expect(tienePermisoSubsidio(['SUPER_ADMIN'], 'SUB_WRITE')).toBe(true);
    expect(tienePermisoSubsidio(['PLA_READ'], 'SUB_WRITE')).toBe(false);
  });
});
