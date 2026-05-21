import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EmpleadoFlowService, personaCumplePasoDatosPersonales } from './empleado-flow.service';
import type { PersonaEmpleado } from '../models/persona-empleado.model';
import { EMPLEADO_FLUJO_PASOS } from '../components/empleado-stepper/empleado-stepper.component';

describe('EmpleadoFlowService', () => {
  let service: EmpleadoFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmpleadoFlowService);
    service.clearProgress(1);
    service.clearProgress(2);
    service.clearProgress(3);
  });

  it('completedSteps devuelve 6 entradas en false para un empleado nuevo', () => {
    const steps = service.completedSteps(1);
    expect(steps().length).toBe(EMPLEADO_FLUJO_PASOS.length);
    expect(steps().every((x) => x === false)).toBe(true);
  });

  it('markCompleted activa el índice indicado sin afectar otros empleados', () => {
    service.markCompleted(1, 0);
    service.markCompleted(1, 4);
    service.markCompleted(2, 2);

    expect(service.completedSteps(1)()).toEqual([true, false, false, false, true, false]);
    expect(service.completedSteps(2)()).toEqual([false, false, true, false, false, false]);
  });

  it('ignora pasos y empleadoId inválidos', () => {
    const before = service.completedSteps(3)();
    service.markCompleted(3, -1);
    service.markCompleted(3, 99);
    service.markCompleted(0, 0);
    service.markCompleted(Number.NaN, 0);
    expect(service.completedSteps(3)()).toEqual(before);
  });

  it('completedSteps(id inválido) devuelve señal siempre en false', () => {
    const s = service.completedSteps(0);
    expect(s().every((x) => x === false)).toBe(true);
    service.markCompleted(1, 1);
    expect(s().every((x) => x === false)).toBe(true);
  });

  it('clearProgress reinicia el colaborador', () => {
    service.markCompleted(1, 1);
    expect(service.completedSteps(1)()[1]).toBe(true);
    service.clearProgress(1);
    expect(service.completedSteps(1)().every((x) => x === false)).toBe(true);
  });

  it('reutiliza la misma referencia de señal por empleadoId', () => {
    const a = service.completedSteps(7);
    const b = service.completedSteps(7);
    expect(a).toBe(b);
  });

  it('personaCumplePasoDatosPersonales rechaza personas incompletas o sin empleadoId', () => {
    expect(
      personaCumplePasoDatosPersonales({
        id: 1,
        empleadoId: null,
        nombreCompleto: 'ANA',
        dni: '12345678',
        email: 'a@x.pe',
      } as PersonaEmpleado),
    ).toBe(false);
    expect(
      personaCumplePasoDatosPersonales({
        id: 1,
        empleadoId: 9,
        nombreCompleto: '   ',
        dni: '12345678',
        email: 'a@x.pe',
      } as PersonaEmpleado),
    ).toBe(false);
    expect(
      personaCumplePasoDatosPersonales({
        id: 1,
        empleadoId: 9,
        nombreCompleto: 'ANA',
        dni: '12345',
        email: 'a@x.pe',
      } as PersonaEmpleado),
    ).toBe(false);
  });

  it('hydrateFromPersona marca solo paso 0 cuando la ficha RRHH cumple criterios', () => {
    service.clearProgress(8);
    service.hydrateFromPersona({
      id: 3,
      empleadoId: 8,
      nombreCompleto: 'MARÍA QUISPE',
      dni: '40404040',
      email: 'm@indeci.gob.pe',
    } as PersonaEmpleado);
    expect(service.completedSteps(8)()).toEqual([true, false, false, false, false, false]);
    service.hydrateFromPersona({
      id: 3,
      empleadoId: 8,
      nombreCompleto: 'MARÍA QUISPE',
      dni: '40404040',
      email: 'm@indeci.gob.pe',
    } as PersonaEmpleado);
    expect(service.completedSteps(8)()[0]).toBe(true);
  });
});
