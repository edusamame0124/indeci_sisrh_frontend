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
import { EmpleadoBancoFormPageComponent } from './empleado-banco-form-page.component';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

describe('EmpleadoBancoFormPageComponent (Spec 009 / T136 — accountTypeId desde response)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(opts: {
    mode: 'create' | 'edit';
    personaId?: string;
    cuentaId?: string;
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
                : k === 'cuentaId'
                  ? (opts.cuentaId ?? null)
                  : null,
          },
        },
      },
    };
  }

  function buildFixture(opts: {
    mode: 'create' | 'edit';
    personaId?: string;
    cuentaId?: string;
  }) {
    TestBed.configureTestingModule({
      imports: [EmpleadoBancoFormPageComponent],
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
    return TestBed.createComponent(EmpleadoBancoFormPageComponent);
  }

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  function flushCatalogosAndPersona(fixture: ReturnType<typeof buildFixture>): void {
    fixture.detectChanges();
    httpMock.expectOne('/api/catalogos/bancos').flush({ data: [{ id: 2, name: 'BCP' }] });
    httpMock.expectOne('/api/catalogos/tipos-cuenta').flush({
      data: [{ id: 3, name: 'Ahorros' }],
    });
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: 42,
        nombreCompleto: 'Ana Pérez',
        dni: '11223344',
        email: 'ana@indeci.gob.pe',
      },
    });
  }

  it('en modo edit, patchea accountTypeId desde el response denormalizado del backend', () => {
    const fixture = buildFixture({ mode: 'edit', personaId: '7', cuentaId: '11' });
    fixture.detectChanges();

    httpMock.expectOne('/api/catalogos/bancos').flush({
      data: [{ id: 2, name: 'BCP' }],
    });
    httpMock.expectOne('/api/catalogos/tipos-cuenta').flush({
      data: [{ id: 3, name: 'Ahorros' }],
    });
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: 42,
        nombreCompleto: 'Ana Pérez',
        dni: '11223344',
        email: 'ana@indeci.gob.pe',
      },
    });
    httpMock.expectOne('/api/rrhh/banco/42').flush({
      data: [
        {
          id: 11,
          bankId: 2,
          accountTypeId: 3,
          numeroCuenta: '001234567890',
          cci: '00200300400567890123',
          esCuentaPlanilla: 1,
          activo: 1,
          bank: 'BCP',
          accountType: 'Ahorros',
        },
      ],
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.accountTypeId.value).toBe(3);
    expect(comp.form.controls.bankId.value).toBe(2);
    expect(comp.form.controls.numeroCuenta.value).toBe('001234567890');
    expect(comp.form.controls.esCuentaPlanilla.value).toBe(1);
  });

  it('en modo create, NO patchea accountTypeId; sigue null hasta selección', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();

    httpMock.expectOne('/api/catalogos/bancos').flush({
      data: [{ id: 2, name: 'BCP' }],
    });
    httpMock.expectOne('/api/catalogos/tipos-cuenta').flush({
      data: [{ id: 3, name: 'Ahorros' }],
    });
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: 42,
        nombreCompleto: 'Ana Pérez',
        dni: '11223344',
        email: 'ana@indeci.gob.pe',
      },
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.accountTypeId.value).toBeNull();
    expect(comp.form.controls.accountTypeId.hasError('required')).toBe(true);
  });

  it('rechaza letras en número de cuenta y las elimina al escribir', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    flushCatalogosAndPersona(fixture);
    const comp = fixture.componentInstance;

    comp.form.controls.numeroCuenta.setValue('asdf1234');
    expect(comp.form.controls.numeroCuenta.hasError('pattern')).toBe(true);

    const input = document.createElement('input');
    input.value = 'asdf1234';
    comp.onDigitsOnlyInput({ target: input } as unknown as Event, 'numeroCuenta');
    expect(comp.form.controls.numeroCuenta.value).toBe('1234');
    expect(comp.form.controls.numeroCuenta.hasError('pattern')).toBe(false);
  });

  it('CCI vacío es válido; con valor exige exactamente 20 dígitos', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    flushCatalogosAndPersona(fixture);
    const comp = fixture.componentInstance;

    comp.form.controls.cci.setValue('');
    expect(comp.form.controls.cci.valid).toBe(true);

    comp.form.controls.cci.setValue('123');
    expect(comp.form.controls.cci.hasError('cciLength')).toBe(true);

    comp.form.controls.cci.setValue('00200300400567890123');
    expect(comp.form.controls.cci.valid).toBe(true);
  });

  it('rechaza más de 30 dígitos en número de cuenta', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    flushCatalogosAndPersona(fixture);
    const comp = fixture.componentInstance;

    comp.form.controls.numeroCuenta.setValue('1'.repeat(31));
    expect(comp.form.controls.numeroCuenta.hasError('maxlength')).toBe(true);
  });
});
