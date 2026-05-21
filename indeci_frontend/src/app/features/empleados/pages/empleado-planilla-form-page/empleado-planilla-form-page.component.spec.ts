import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { EmpleadoPlanillaFormPageComponent } from './empleado-planilla-form-page.component';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

describe('EmpleadoPlanillaFormPageComponent (Spec 013/C1 — configuración remunerativa)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(opts: {
    mode: 'create' | 'edit';
    personaId?: string;
    planillaId?: string;
  }) {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          data: { mode: opts.mode },
          paramMap: {
            get: (k: string) =>
              k === 'personaId'
                ? opts.personaId ?? '7'
                : k === 'planillaId'
                  ? (opts.planillaId ?? null)
                  : null,
          },
        },
      },
    };
  }

  function buildFixture(opts: {
    mode: 'create' | 'edit';
    personaId?: string;
    planillaId?: string;
  }) {
    TestBed.configureTestingModule({
      imports: [EmpleadoPlanillaFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(opts),
        {
          provide: EmpleadoFlowBackendSyncService,
          useValue: { syncCompletedStepsFromBackend: () => of(undefined) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(EmpleadoPlanillaFormPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('en modo edit, patchea solo los 4 campos base — ignora descuentos y flag', () => {
    const fixture = buildFixture({ mode: 'edit', personaId: '7', planillaId: '11' });
    fixture.detectChanges();

    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: 42,
        nombreCompleto: 'Ana Pérez',
        dni: '11223344',
        email: 'ana@indeci.gob.pe',
      },
    });
    // Backend sigue devolviendo descuentos y tieneAsignacionFamiliar para
    // retrocompatibilidad; el form los ignora (Spec 013/C1).
    httpMock.expectOne('/api/rrhh/planilla/42').flush({
      data: [
        {
          id: 11,
          sueldoBasico: 3500,
          movilidad: 200,
          alimentacion: 150,
          tieneAsignacionFamiliar: 1,
          numHijos: 2,
          activo: 1,
          descuentoBanco: 320.5,
          descuentoInstitucion: 80,
        },
      ],
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.sueldoBasico.value).toBe(3500);
    expect(comp.form.controls.movilidad.value).toBe(200);
    expect(comp.form.controls.alimentacion.value).toBe(150);
    expect(comp.form.controls.numHijos.value).toBe(2);
    expect(comp.tieneHijos()).toBe(true);
  });

  it('Spec 013/C1 — el form solo expone los 4 controles maestros', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });
    const comp = fixture.componentInstance;
    expect(Object.keys(comp.form.controls).sort()).toEqual(
      ['alimentacion', 'movilidad', 'numHijos', 'sueldoBasico'],
    );
  });

  it('en modo create, sueldoBasico es requerido', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();

    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: 42,
        nombreCompleto: 'X',
        dni: '11223344',
        email: 'x@y.pe',
      },
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.sueldoBasico.value).toBeNull();
    expect(comp.form.controls.sueldoBasico.hasError('required')).toBe(true);
    expect(comp.tieneHijos()).toBe(false);
  });

  it('Spec 013/C1 — tieneHijos() se hace true cuando numHijos > 0', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });
    const comp = fixture.componentInstance;

    expect(comp.tieneHijos()).toBe(false);
    comp.form.controls.numHijos.setValue(0);
    expect(comp.tieneHijos()).toBe(false);
    comp.form.controls.numHijos.setValue(2);
    expect(comp.tieneHijos()).toBe(true);
    comp.form.controls.numHijos.setValue(null);
    expect(comp.tieneHijos()).toBe(false);
  });

  it('sueldoBasico mayor a 99999.99 dispara el validador max', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;

    // 5 dígitos exactos: válido.
    comp.form.controls.sueldoBasico.setValue(99999);
    expect(comp.form.controls.sueldoBasico.hasError('max')).toBe(false);

    // 5 dígitos + 2 decimales (tope): válido.
    comp.form.controls.sueldoBasico.setValue(99999.99);
    expect(comp.form.controls.sueldoBasico.hasError('max')).toBe(false);

    // 6 dígitos enteros: rechazado.
    comp.form.controls.sueldoBasico.setValue(100000);
    expect(comp.form.controls.sueldoBasico.hasError('max')).toBe(true);

    // El caso del bug original: cadena enorme.
    comp.form.controls.sueldoBasico.setValue(6516516516516);
    expect(comp.form.controls.sueldoBasico.hasError('max')).toBe(true);
  });

  it('onSueldoBasicoInput trunca a 5 dígitos enteros y 2 decimales mientras se teclea', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });
    const comp = fixture.componentInstance;

    // Caso 1: pegado de cadena larga sin decimal → solo 5 primeros dígitos.
    let input = document.createElement('input');
    input.value = '6516516516516';
    comp.onSueldoBasicoInput({ target: input } as unknown as Event);
    expect(comp.form.controls.sueldoBasico.value).toBe(65165);

    // Caso 2: parte entera larga + decimales → entero truncado a 5, 2 decimales preservados.
    input = document.createElement('input');
    input.value = '12345678.456';
    comp.onSueldoBasicoInput({ target: input } as unknown as Event);
    expect(comp.form.controls.sueldoBasico.value).toBe(12345.45);

    // Caso 3: dentro del tope, no se toca el form.
    comp.form.controls.sueldoBasico.setValue(3500);
    input = document.createElement('input');
    input.value = '3500';
    comp.onSueldoBasicoInput({ target: input } as unknown as Event);
    expect(comp.form.controls.sueldoBasico.value).toBe(3500);
  });
});
