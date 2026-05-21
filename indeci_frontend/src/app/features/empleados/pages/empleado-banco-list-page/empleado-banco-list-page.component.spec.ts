import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoBancoListPageComponent } from './empleado-banco-list-page.component';

describe('EmpleadoBancoListPageComponent (Spec 009 / T136 — denormalizado)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(personaId: string = '7') {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: { get: (k: string) => (k === 'personaId' ? personaId : null) },
        },
      },
    };
  }

  function buildFixture(personaId: string = '7') {
    TestBed.configureTestingModule({
      imports: [EmpleadoBancoListPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(personaId),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(EmpleadoBancoListPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('NO pide /api/catalogos/bancos al cargar (usa `bank` denormalizado del response)', () => {
    const fixture = buildFixture();
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
    httpMock.expectOne('/api/rrhh/banco/42').flush({
      data: [
        {
          id: 1,
          bankId: 2,
          accountTypeId: 3,
          numeroCuenta: '123',
          cci: '999',
          esCuentaPlanilla: 1,
          activo: 1,
          bank: 'BCP',
          accountType: 'Ahorros',
        },
      ],
    });

    httpMock.expectNone('/api/catalogos/bancos');
    const comp = fixture.componentInstance;
    expect(comp.rows().length).toBe(1);
    expect(comp.rows()[0].bank).toBe('BCP');
    expect(comp.rows()[0].accountType).toBe('Ahorros');
  });

  it('incluye columna "tipo" en el orden de columnas', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect([...comp.columns]).toEqual([
      'banco',
      'tipo',
      'numeroCuenta',
      'cci',
      'planilla',
      'acciones',
    ]);

    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });
    httpMock.expectOne('/api/rrhh/banco/42').flush({ data: [] });
  });
});
