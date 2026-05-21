import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoPensionFormPageComponent } from './empleado-pension-form-page.component';

describe('EmpleadoPensionFormPageComponent (Hotfix Pensión)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(): { provide: typeof ActivatedRoute; useValue: unknown } {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          data: { mode: 'create' },
          paramMap: { get: (k: string) => (k === 'personaId' ? '7' : null) },
        },
      },
    };
  }

  function buildFixture() {
    TestBed.configureTestingModule({
      imports: [EmpleadoPensionFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(EmpleadoPensionFormPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  /**
   * Spec 013 / C1 — al seleccionar un régimen AFP el form llama
   * `/api/rrhh/pension/tasas-vigentes`. Las pruebas que cambian a AFP deben
   * flushear esa request para que `httpMock.verify()` no falle.
   */
  function flushTasasVigentes() {
    const req = httpMock.expectOne(
      (r) => r.url === '/api/rrhh/pension/tasas-vigentes',
    );
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: {
        tipoRegimen: 'AFP',
        aporte: 0.10,
        comision: 0.016,
        prima: 0.0137,
        comisionParametrizada: true,
      },
    });
  }

  it('crea form con los controles del nuevo contrato (sin afpId, sin tipo)', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;

    const controlNames = Object.keys(comp.form.controls).sort();
    expect(controlNames).toEqual(
      [
        'regimenPensionarioId',
        'cuspp',
        'tipoComisionAfpId',
        'porcentajeAporte',
        'porcentajeComision',
        'porcentajeSeguro',
      ].sort(),
    );
  });

  it('regimenPensionarioId es requerido', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.form.controls.regimenPensionarioId.hasError('required')).toBe(true);
  });

  it('esAfp() es true cuando el régimen seleccionado tiene tipo AFP', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    comp.regimenes.set([
      { id: 1, nombre: 'INTEGRA', codigo: 'INT', tipo: 'AFP', activo: 1 },
      { id: 2, nombre: 'ONP', codigo: 'ONP', tipo: 'ONP', activo: 1 },
    ]);
    comp.form.controls.regimenPensionarioId.setValue(1);
    flushTasasVigentes();
    expect(comp.esAfp()).toBe(true);
    expect(comp.form.controls.cuspp.hasError('required')).toBe(true);
    expect(comp.form.controls.tipoComisionAfpId.hasError('required')).toBe(true);
  });

  it('esAfp() es false cuando el régimen seleccionado es ONP y limpia validadores', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    comp.regimenes.set([
      { id: 2, nombre: 'ONP', codigo: 'ONP', tipo: 'ONP', activo: 1 },
    ]);
    comp.form.controls.regimenPensionarioId.setValue(2);
    expect(comp.esAfp()).toBe(false);
    expect(comp.form.controls.cuspp.hasError('required')).toBe(false);
    expect(comp.form.controls.tipoComisionAfpId.hasError('required')).toBe(false);
  });

  it('CUSPP rechaza valor que no sea de 12 caracteres alfanuméricos cuando es AFP', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    comp.regimenes.set([{ id: 1, nombre: 'INTEGRA', codigo: 'INT', tipo: 'AFP', activo: 1 }]);
    comp.form.controls.regimenPensionarioId.setValue(1);
    flushTasasVigentes();

    // Menos de 12 caracteres.
    comp.form.controls.cuspp.setValue('ABC');
    expect(comp.form.controls.cuspp.hasError('pattern')).toBe(true);

    // 12 dígitos puros → válido.
    comp.form.controls.cuspp.setValue('123456789012');
    expect(comp.form.controls.cuspp.hasError('pattern')).toBe(false);

    // 12 alfanuméricos mayúsculas (caso real CUSPP) → válido.
    comp.form.controls.cuspp.setValue('GONZAL94125B');
    expect(comp.form.controls.cuspp.hasError('pattern')).toBe(false);

    // Minúsculas → rechazo (debería venir saneado a mayúsculas vía onCusppInput).
    comp.form.controls.cuspp.setValue('gonzal94125b');
    expect(comp.form.controls.cuspp.hasError('pattern')).toBe(true);

    // Carácter especial → rechazo.
    comp.form.controls.cuspp.setValue('GONZAL-9412B');
    expect(comp.form.controls.cuspp.hasError('pattern')).toBe(true);
  });

  it('Spec 013/C1 — onCusppInput sanea mayúsculas, descarta inválidos y trunca a 12', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;

    // Caso 1: minúsculas + número → uppercase, sin tocar dígitos.
    let input = document.createElement('input');
    input.value = 'gonzal94125b';
    comp.onCusppInput({ target: input } as unknown as Event);
    expect(comp.form.controls.cuspp.value).toBe('GONZAL94125B');

    // Caso 2: caracteres especiales (espacios, guiones, símbolos) → eliminados.
    input = document.createElement('input');
    input.value = 'GO N-Z A_L9 4*12 5B';
    comp.onCusppInput({ target: input } as unknown as Event);
    expect(comp.form.controls.cuspp.value).toBe('GONZAL94125B');

    // Caso 3: más de 12 caracteres → truncado a 12.
    input = document.createElement('input');
    input.value = 'GONZAL94125BX9999';
    comp.onCusppInput({ target: input } as unknown as Event);
    expect(comp.form.controls.cuspp.value).toBe('GONZAL94125B');
  });

  it('Spec 013/C1 — al seleccionar AFP autocompleta los 3 % del catálogo', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    comp.regimenes.set([{ id: 1, nombre: 'INTEGRA', codigo: 'INTEGRA', tipo: 'AFP', activo: 1 }]);
    comp.form.controls.regimenPensionarioId.setValue(1);
    flushTasasVigentes();

    // Las tasas llegan como fracciones (0.10, 0.016, 0.0137) y se muestran en %.
    expect(comp.form.controls.porcentajeAporte.value).toBe(10);
    expect(comp.form.controls.porcentajeComision.value).toBe(1.6);
    expect(comp.form.controls.porcentajeSeguro.value).toBe(1.37);
    // Por defecto los 3 % quedan readonly (deshabilitados) hasta "Personalizar".
    expect(comp.form.controls.porcentajeAporte.disabled).toBe(true);
    expect(comp.personalizarTasas()).toBe(false);
  });

  it('Spec 013/C1 — togglePersonalizar habilita los 3 % para edición', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    comp.regimenes.set([{ id: 1, nombre: 'INTEGRA', codigo: 'INTEGRA', tipo: 'AFP', activo: 1 }]);
    comp.form.controls.regimenPensionarioId.setValue(1);
    flushTasasVigentes();

    comp.togglePersonalizar();
    expect(comp.personalizarTasas()).toBe(true);
    expect(comp.form.controls.porcentajeAporte.disabled).toBe(false);
    expect(comp.form.controls.porcentajeComision.disabled).toBe(false);
    expect(comp.form.controls.porcentajeSeguro.disabled).toBe(false);
  });

  it('Spec 013/C1 — ONP no dispara fetch de tasas y limpia los 3 %', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    comp.regimenes.set([
      { id: 2, nombre: 'ONP', codigo: 'ONP', tipo: 'ONP', activo: 1 },
    ]);
    comp.form.controls.porcentajeAporte.setValue(13);
    comp.form.controls.regimenPensionarioId.setValue(2);
    // No flush — ONP no llama tasas-vigentes. httpMock.verify() lo confirma.
    expect(comp.esOnp()).toBe(true);
    expect(comp.form.controls.porcentajeAporte.value).toBeNull();
    expect(comp.form.controls.porcentajeAporte.disabled).toBe(true);
  });
});
