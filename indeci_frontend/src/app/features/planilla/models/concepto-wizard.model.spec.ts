import { describe, expect, it } from 'vitest';
import {
  derivarTipoLegacy,
  derivarVisibilidad,
  derivarVistaPrevia,
  type VistaPreviaEntrada,
} from './concepto-wizard.model';

/** Entrada base sin afectaciones para construir casos de vista previa. */
const baseVistaPrevia: VistaPreviaEntrada = {
  modoCalculo: 'RESULTADO_MOTOR',
  clasificacionMotor: null,
  afectoAportePens: false,
  afectoEssalud: false,
  afectoIr5ta: false,
  prorrateable: false,
  esMuc: false,
  esCuc: false,
};

describe('derivarVisibilidad (SPEC_CONCEPTOS_PLANILLA §3.A — visibilidad condicional)', () => {
  it('REMUNERATIVO muestra afectaciones, MUC/CUC, prorrateo y exige MEF', () => {
    const v = derivarVisibilidad('REMUNERATIVO');
    expect(v.afectoAportePens).toBe(true);
    expect(v.afectoEssalud).toBe(true);
    expect(v.afectoIr5ta).toBe(true);
    expect(v.mucCuc).toBe(true);
    expect(v.prorrateable).toBe(true);
    expect(v.codigoMefObligatorio).toBe(true);
    expect(v.codigoTributoSunat).toBe(false);
  });

  it('APORTE_EMPLEADOR oculta afectación 5ta y MUC/CUC', () => {
    const v = derivarVisibilidad('APORTE_EMPLEADOR');
    expect(v.afectoIr5ta).toBe(false);
    expect(v.mucCuc).toBe(false);
    expect(v.afectoEssalud).toBe(true);
    expect(v.codigoMefObligatorio).toBe(false);
  });

  it('DESCUENTO muestra IR5ta + tributo SUNAT, oculta MUC/CUC y no exige MEF', () => {
    const v = derivarVisibilidad('DESCUENTO');
    expect(v.codigoTributoSunat).toBe(true);
    expect(v.afectoIr5ta).toBe(true);
    expect(v.mucCuc).toBe(false);
    expect(v.codigoMefObligatorio).toBe(false);
  });

  it('APORTE_TRABAJADOR afecta pensión pero no ESSALUD ni MUC/CUC', () => {
    const v = derivarVisibilidad('APORTE_TRABAJADOR');
    expect(v.afectoAportePens).toBe(true);
    expect(v.afectoEssalud).toBe(false);
    expect(v.mucCuc).toBe(false);
    expect(v.afectoIr5ta).toBe(false);
  });

  it('sin tipo definido oculta lo condicional sensible', () => {
    const v = derivarVisibilidad(null);
    expect(v.codigoMefObligatorio).toBe(false);
    expect(v.mucCuc).toBe(false);
    expect(v.afectoIr5ta).toBe(false);
  });
});

describe('derivarTipoLegacy', () => {
  it('descuentos y aportes del trabajador → DESCUENTO', () => {
    expect(derivarTipoLegacy('DESCUENTO')).toBe('DESCUENTO');
    expect(derivarTipoLegacy('APORTE_TRABAJADOR')).toBe('DESCUENTO');
  });

  it('remunerativos y aporte empleador → INGRESO', () => {
    expect(derivarTipoLegacy('REMUNERATIVO')).toBe('INGRESO');
    expect(derivarTipoLegacy('NO_REMUNERATIVO')).toBe('INGRESO');
    expect(derivarTipoLegacy('APORTE_EMPLEADOR')).toBe('INGRESO');
    expect(derivarTipoLegacy(null)).toBe('INGRESO');
  });
});

describe('derivarVistaPrevia (SPEC_CONCEPTOS_PLANILLA §14 — P4 vista previa del efecto)', () => {
  it('RESULTADO_MOTOR explica que el motor valoriza y no se ingresa a mano', () => {
    const vp = derivarVistaPrevia({
      ...baseVistaPrevia,
      modoCalculo: 'RESULTADO_MOTOR',
      clasificacionMotor: 'REMUNERATIVO',
    });
    expect(vp.valorizacion).toMatch(/motor de planilla/i);
    expect(vp.valorizacion).toMatch(/no se ingresa a mano/i);
    expect(vp.origenMonto).toMatch(/motor/i);
  });

  it('cada modo de cálculo produce su microcopy de valorización', () => {
    const por = (m: VistaPreviaEntrada['modoCalculo']) =>
      derivarVistaPrevia({ ...baseVistaPrevia, modoCalculo: m }).valorizacion;
    expect(por('MONTO_FIJO')).toMatch(/importe fijo/i);
    expect(por('PORCENTAJE')).toMatch(/porcentaje/i);
    expect(por('MONTO_INDIVIDUAL')).toMatch(/por trabajador/i);
    expect(por('IMPORTACION')).toMatch(/archivo/i);
  });

  it('REMUNERATIVO suma a ingresos y lista bases afectadas', () => {
    const vp = derivarVistaPrevia({
      ...baseVistaPrevia,
      clasificacionMotor: 'REMUNERATIVO',
      afectoAportePens: true,
      afectoEssalud: true,
      afectoIr5ta: true,
      esMuc: true,
    });
    expect(vp.efectoNeto).toMatch(/suma a los ingresos/i);
    expect(vp.afectaciones.join(' ')).toMatch(/pensión/i);
    expect(vp.afectaciones.join(' ')).toMatch(/esSalud/i);
    expect(vp.afectaciones.join(' ')).toMatch(/ir 5ta/i);
    expect(vp.afectaciones.join(' ')).toMatch(/MUC/);
    expect(vp.resumen).toMatch(/sumará a los ingresos/i);
  });

  it('DESCUENTO descuenta del neto', () => {
    const vp = derivarVistaPrevia({
      ...baseVistaPrevia,
      clasificacionMotor: 'DESCUENTO',
    });
    expect(vp.efectoNeto).toMatch(/descuenta del neto/i);
    expect(vp.resumen).toMatch(/reducirá el neto/i);
  });

  it('APORTE_EMPLEADOR es costo de la entidad y no descuenta al trabajador', () => {
    const vp = derivarVistaPrevia({
      ...baseVistaPrevia,
      clasificacionMotor: 'APORTE_EMPLEADOR',
      afectoEssalud: true,
    });
    expect(vp.efectoNeto).toMatch(/costo de la entidad/i);
    expect(vp.efectoNeto).toMatch(/no descuenta al trabajador/i);
    expect(vp.resumen).toMatch(/costo de la entidad/i);
  });

  it('sin clasificación pide definir el Tipo de Concepto', () => {
    const vp = derivarVistaPrevia(baseVistaPrevia);
    expect(vp.efectoNeto).toMatch(/defina el tipo de concepto/i);
    expect(vp.resumen).toMatch(/seleccione el tipo de concepto/i);
  });

  it('sin afectaciones marca explícitamente que no afecta otras bases', () => {
    const vp = derivarVistaPrevia({
      ...baseVistaPrevia,
      clasificacionMotor: 'NO_REMUNERATIVO',
    });
    expect(vp.afectaciones).toHaveLength(1);
    expect(vp.afectaciones[0]).toMatch(/no afecta otras bases/i);
  });

  it('§15: lista las planillas asociadas en la línea "Aparece en las planillas: …"', () => {
    const vp = derivarVistaPrevia({
      ...baseVistaPrevia,
      clasificacionMotor: 'REMUNERATIVO',
      planillas: ['CAS', 'CAS TEMPORAL'],
    });
    expect(vp.planillas).toBe('Aparece en las planillas: CAS, CAS TEMPORAL.');
  });

  it('§15: sin planillas asociadas pide seleccionar al menos una', () => {
    const vp = derivarVistaPrevia({ ...baseVistaPrevia, planillas: [] });
    expect(vp.planillas).toMatch(/seleccione al menos un tipo de planilla/i);
  });
});
