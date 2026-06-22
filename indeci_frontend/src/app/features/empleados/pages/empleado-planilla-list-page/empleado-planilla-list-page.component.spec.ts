import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoPlanillaListPageComponent } from './empleado-planilla-list-page.component';
import type { EmpleadoPlanillaRow } from '../../models/empleado-planilla.model';

describe('EmpleadoPlanillaListPageComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute() {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: { get: (k: string) => (k === 'personaId' ? '7' : null) },
        },
      },
    };
  }

  function buildFixture() {
    TestBed.configureTestingModule({
      imports: [EmpleadoPlanillaListPageComponent],
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
    return TestBed.createComponent(EmpleadoPlanillaListPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('expone columnas sin movilidad ni alimentación', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.columns).not.toContain('movilidad');
    expect(comp.columns).not.toContain('alimentacion');
    expect(comp.columns).not.toContain('sueldoBasico');
    expect(comp.columns).toContain('codigoAirhsp');
    expect(comp.columns).toContain('remuneracionMensual');
    expect(comp.columns).toContain('incrementosDs');
  });

  it('fmtIncrementosDs calcula 364.19 cuando sueldoBasico=4864.19 y montoContrato=4500', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    const row: EmpleadoPlanillaRow = {
      id: 1,
      sueldoBasico: 4864.19,
      codigoAirhsp: '000051',
      montoContrato: 4500,
      tieneAsignacionFamiliar: 1,
      numHijos: 1,
      activo: 1,
      descuentoBanco: null,
      descuentoInstitucion: null,
      regimenLaboralId: 3,
      tipoContratoId: null,
      condicionLaboralId: null,
      regimenLaboral: '1057',
      tipoContrato: 'PLAZO DETERMINADO',
      condicionLaboral: 'CAS',
    };
    expect(comp.fmtIncrementosDs(row)).toBe(comp.fmtMoney(364.19));
  });

  it('fmtIncrementosDs muestra — cuando montoContrato es null (legacy)', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    const row: EmpleadoPlanillaRow = {
      id: 1,
      sueldoBasico: 4864.19,
      codigoAirhsp: null,
      montoContrato: null,
      tieneAsignacionFamiliar: 0,
      numHijos: 0,
      activo: 1,
      descuentoBanco: null,
      descuentoInstitucion: null,
      regimenLaboralId: null,
      tipoContratoId: null,
      condicionLaboralId: null,
      regimenLaboral: null,
      tipoContrato: null,
      condicionLaboral: null,
    };
    expect(comp.fmtIncrementosDs(row)).toBe('—');
  });

  it('fmtAirhsp muestra código monospace-ready', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.fmtAirhsp('000051')).toBe('000051');
    expect(comp.fmtAirhsp(null)).toBe('—');
  });
});
