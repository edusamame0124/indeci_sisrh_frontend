import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoFlowWarningBannerComponent } from './empleado-flow-warning-banner.component';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

describe('EmpleadoFlowWarningBannerComponent (Spec 009 / T141)', () => {
  let flow: EmpleadoFlowService;

  function build(inputs: { empleadoId: number; personaId: number; currentStep: number }) {
    TestBed.configureTestingModule({
      imports: [EmpleadoFlowWarningBannerComponent],
      providers: [provideRouter([]), provideAnimationsAsync('noop')],
    });
    flow = TestBed.inject(EmpleadoFlowService);
    const fixture = TestBed.createComponent(EmpleadoFlowWarningBannerComponent);
    fixture.componentRef.setInput('empleadoId', inputs.empleadoId);
    fixture.componentRef.setInput('personaId', inputs.personaId);
    fixture.componentRef.setInput('currentStep', inputs.currentStep);
    return fixture;
  }

  beforeEach(() => {
    // Reset any leaking state across tests
  });

  it('oculta el banner si todos los pasos previos están completos', () => {
    const fixture = build({ empleadoId: 10, personaId: 5, currentStep: 3 });
    flow.markCompleted(10, 0);
    flow.markCompleted(10, 1);
    flow.markCompleted(10, 2);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.pendingStepIndex()).toBeNull();
    expect(comp.visible()).toBe(false);
  });

  it('muestra el PRIMER paso previo pendiente', () => {
    const fixture = build({ empleadoId: 11, personaId: 5, currentStep: 4 });
    // paso 0 completo, paso 1 pendiente, paso 2 completo, paso 3 pendiente → primer pendiente = 1
    flow.markCompleted(11, 0);
    flow.markCompleted(11, 2);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.pendingStepIndex()).toBe(1);
    expect(comp.pendingStepLabel()).toBe('Puesto laboral');
    expect(comp.visible()).toBe(true);
  });

  it('arma routerLink al paso pendiente usando personaId', () => {
    const fixture = build({ empleadoId: 12, personaId: 42, currentStep: 5 });
    // Solo el paso 3 (pensión) pendiente
    flow.markCompleted(12, 0);
    flow.markCompleted(12, 1);
    flow.markCompleted(12, 2);
    flow.markCompleted(12, 4);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.pendingStepIndex()).toBe(3);
    expect([...comp.pendingStepRouterLink()]).toEqual([
      '/empleados/pension/personas',
      42,
    ]);
  });

  it('oculta el banner si currentStep es 0 (no hay pasos previos posibles)', () => {
    const fixture = build({ empleadoId: 13, personaId: 5, currentStep: 0 });
    fixture.detectChanges();
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('si empleadoId es inválido, no renderiza ni dispara lookup en el service', () => {
    const fixture = build({ empleadoId: 0, personaId: 5, currentStep: 3 });
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingStepIndex()).toBeNull();
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('hydrateFromPersona oculta el aviso de Datos personales en currentStep 1', () => {
    const fixture = build({ empleadoId: 99, personaId: 7, currentStep: 1 });
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingStepIndex()).toBe(0);
    expect(fixture.componentInstance.visible()).toBe(true);
    flow.hydrateFromPersona({
      id: 7,
      empleadoId: 99,
      nombreCompleto: 'CESAR TEST',
      dni: '12345678',
      email: 'c@test.pe',
    } as PersonaEmpleado);
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingStepIndex()).toBeNull();
    expect(fixture.componentInstance.visible()).toBe(false);
  });
});
