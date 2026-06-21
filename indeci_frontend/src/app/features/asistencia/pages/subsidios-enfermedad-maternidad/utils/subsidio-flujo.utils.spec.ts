import { describe, expect, it } from 'vitest';

import {

  accionPrioritariaFlujo,

  calcularCompletitudFlujo,

  mostrarMontoPlanilla,

  requisitosCriticosBanner,

} from './subsidio-flujo.utils';

import type { SubsidioCasoResponse, SubsidioLiquidacionResponse } from '../models/subsidio.models';



const casoBase: SubsidioCasoResponse = {

  id: 1,

  empleadoId: 10,

  codigoCaso: 'SUB-001',

  tipoCaso: 'ENFERMEDAD',

  estado: 'BORRADOR',

  fechaContingencia: '2026-05-01',

  fechaInicio: '2026-05-02',

  fechaFin: '2026-05-20',

  diasContingencia: 19,

  versionCaso: 1,

  reglaVigenciaId: 1,

  modoCalculo: 'OFICIAL',

  observacion: null,

  nombreEmpleado: 'Juan Pérez',

  dniEmpleado: '12345678',

  createdAt: null,

  citts: [],

  tramos: [],

};



describe('subsidio-flujo.utils', () => {

  it('limita requisitos críticos del banner a dos ítems', () => {

    const reqs = requisitosCriticosBanner([], casoBase, false, null);

    expect(reqs.length).toBeLessThanOrEqual(2);

    expect(reqs[0]).toContain('CITT');

  });



  it('calcula completitud por tramos y liquidación', () => {

    const casoConTramos: SubsidioCasoResponse = {

      ...casoBase,

      citts: [{ id: 1, casoId: 1, nroCitt: 'X', fechaEmision: '2026-05-01', fechaInicio: '2026-05-02', fechaFin: '2026-05-20', estado: 'VIGENTE', tipoDocumento: null, accesoRestringido: 'S', createdAt: null }],

      tramos: [{

        id: 5,

        casoId: 1,

        periodo: '202605',

        fechaDesde: '2026-05-02',

        fechaHasta: '2026-05-20',

        diasSubsidio: 19,

        diasLaborados: 0,

        estadoTramo: 'CALCULADO',

        versionTramo: 1,

      }],

    };

    const liq: SubsidioLiquidacionResponse = {

      id: 9,

      tramoId: 5,

      versionLiq: 1,

      estado: 'CALCULADO',

      contraprestacionDiaria: 100,

      contraprestacionEquivalente: 1900,

      subsidioDiarioEssalud: 80,

      subsidioEstimado: 1520,

      diferencialIndeci: 380,

      conciliacionTotal: 1900,

      formulaAplicada: null,

      createdAt: null,

    };

    const comp = calcularCompletitudFlujo(casoConTramos, true, liq);

    expect(comp.datos).toBe(true);

    expect(comp.tramos).toBe(true);

    expect(comp.calculo).toBe(true);

  });



  it('muestra monto planilla solo con liquidación calculada y estado permitido', () => {

    const liq: SubsidioLiquidacionResponse = {

      id: 1,

      tramoId: 1,

      versionLiq: 1,

      estado: 'CALCULADO',

      contraprestacionDiaria: 0,

      contraprestacionEquivalente: 0,

      subsidioDiarioEssalud: 0,

      subsidioEstimado: 100,

      diferencialIndeci: 50,

      conciliacionTotal: 150,

      formulaAplicada: null,

      createdAt: null,

    };

    expect(mostrarMontoPlanilla(casoBase, liq)).toBe(true);
    expect(mostrarMontoPlanilla(casoBase, null)).toBe(false);
    expect(mostrarMontoPlanilla(casoBase, { ...liq, estado: 'BORRADOR' })).toBe(false);

  });



  it('define una acción prioritaria por paso activo', () => {

    const accion = accionPrioritariaFlujo(0, casoBase, false, null);

    expect(accion.label).toContain('CITT');

    expect(accion.pasoDestino).toBe(0);

  });

});

