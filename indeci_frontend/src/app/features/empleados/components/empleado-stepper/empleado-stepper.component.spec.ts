import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  EmpleadoStepperComponent,
  EMPLEADO_FLUJO_PASOS,
} from './empleado-stepper.component';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

describe('EmpleadoStepperComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadoStepperComponent],
      providers: [provideAnimationsAsync('noop')],
    });
    setMatIconDefaultFontSetForTests();
  });

  it('expone 6 pasos en el orden del brief Spec 009', () => {
    const fixture = TestBed.createComponent(EmpleadoStepperComponent);
    expect(fixture.componentInstance.steps.length).toBe(6);
    expect(EMPLEADO_FLUJO_PASOS.map((s) => s.label)).toEqual([
      'Datos personales',
      'Puesto laboral',
      'Cuenta bancaria',
      'Configuración pensión',
      'Configuración planilla',
      'Conceptos asignados',
    ]);
  });

  it('recorta currentStep al rango 0…5', () => {
    const fixture = TestBed.createComponent(EmpleadoStepperComponent);
    fixture.componentRef.setInput('currentStep', -3);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStep()).toBe(0);

    fixture.componentRef.setInput('currentStep', 99);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStep()).toBe(5);
  });

  it('refleja completedSteps en completedFlags (relleno y recorte)', () => {
    const fixture = TestBed.createComponent(EmpleadoStepperComponent);
    fixture.componentRef.setInput('completedSteps', [true, true]);
    fixture.detectChanges();
    expect(fixture.componentInstance.completedFlags()).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);

    fixture.componentRef.setInput('completedSteps', [
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.completedFlags()).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it('renderiza el stepper con etiqueta accesible y etiquetas de pasos', () => {
    const fixture = TestBed.createComponent(EmpleadoStepperComponent);
    fixture.componentRef.setInput('currentStep', 2);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const stepper = host.querySelector('mat-vertical-stepper');
    expect(stepper?.getAttribute('aria-label')).toBe('Pasos del flujo de empleado');
    const labels = host.querySelectorAll('.empleado-stepper__label');
    expect(labels.length).toBe(6);
    expect(labels[0]?.textContent?.replace(/\s+/g, ' ').trim()).toContain('Datos personales');
  });
});
