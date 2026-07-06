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
    expect(comp.columns).toContain('estado');
    expect(comp.columns).toContain('vigencia');
  });

  it('estadoLabel y estadoBadgeClass mapean el estado del vínculo', () => {
    const comp = buildFixture().componentInstance;
    expect(comp.estadoLabel('CESADO')).toBe('Cesado');
    expect(comp.estadoBadgeClass('CESADO')).toContain('badge--neutral');
    expect(comp.estadoLabel('VIGENTE')).toBe('Vigente');
    expect(comp.estadoBadgeClass('VIGENTE')).toContain('badge--success');
    expect(comp.estadoLabel(null)).toBe('—');
  });

  it('fmtVigencia formatea inicio y cese/fin', () => {
    const comp = buildFixture().componentInstance;
    const cesado = {
      fechaInicioContrato: '2026-01-01',
      fechaCese: '2026-06-15',
      fechaFin: null,
    } as unknown as EmpleadoPlanillaRow;
    expect(comp.fmtVigencia(cesado)).toBe('01/01/2026 – 15/06/2026');
    const vigente = {
      fechaInicioContrato: '2026-07-01',
      fechaCese: null,
      fechaFin: null,
    } as unknown as EmpleadoPlanillaRow;
    expect(comp.fmtVigencia(vigente)).toBe('01/07/2026 – vigente');
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
      tipoPersonaMefId: null,
      registroPlazaAirhsp: null,
      fechaInicioContrato: null,
    } as unknown as EmpleadoPlanillaRow;
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
      tipoPersonaMefId: null,
      registroPlazaAirhsp: null,
      fechaInicioContrato: null,
    } as unknown as EmpleadoPlanillaRow;
    expect(comp.fmtIncrementosDs(row)).toBe('—');
  });

  it('fmtAirhsp muestra código monospace-ready', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.fmtAirhsp('000051')).toBe('000051');
    expect(comp.fmtAirhsp(null)).toBe('—');
  });
});
