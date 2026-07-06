import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BoletaPageComponent } from './boleta-page.component';
import type { BoletaPagoResponseDto, ConceptoBoletaDto } from '../../models/boleta.model';

describe('BoletaPageComponent (Spec 009 / T160 — FR-R2)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(empleadoId = '42', periodo = '2026-05') {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: {
            get: (k: string) =>
              k === 'empleadoId' ? empleadoId : k === 'periodo' ? periodo : null,
          },
        },
      },
    };
  }

  function build(empleadoId = '42', periodo = '2026-05') {
    TestBed.configureTestingModule({
      imports: [BoletaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(empleadoId, periodo),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(BoletaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  const concepto = (codigo: string, nombre: string, monto: number): ConceptoBoletaDto => ({
    codigo,
    concepto: nombre,
    monto,
  });

  // FASE 4 — la boleta se carga con un solo GET a /data (BoletaPagoResponseDto).
  const boletaData = (opts?: Partial<BoletaPagoResponseDto>): BoletaPagoResponseDto => ({
    periodo: '2026-05',
    nombreCompleto: 'Ana Pérez',
    dni: '11223344',
    regimenLaboral: 'CAS',
    nivelRemunerativo: '',
    cuentaBancaria: '',
    modalidad: '',
    diasLaborados: 30,
    ingresos: [],
    descuentos: [],
    aportes: [],
    totalIngresos: 0,
    totalDescuentos: 0,
    netoPagar: 0,
    ...opts,
  });

  function flushData(data: BoletaPagoResponseDto = boletaData()) {
    httpMock.expectOne('/api/rrhh/boleta/42/2026-05/data').flush(data);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('carga la boleta desde el endpoint /data (FR-R2)', () => {
    const fixture = build();
    flushData(
      boletaData({
        netoPagar: 3220,
        ingresos: [concepto('I1', 'Sueldo básico', 3500), concepto('I2', 'Asignación movilidad', 200)],
        descuentos: [concepto('D1', 'Aporte AFP', 380), concepto('D2', 'Otros descuentos', 100)],
      }),
    );

    const comp = fixture.componentInstance;
    expect(comp.boleta()?.nombreCompleto).toBe('Ana Pérez');
    expect(comp.boleta()?.netoPagar).toBe(3220);
    expect(comp.ingresos().length).toBe(2);
    expect(comp.descuentos().length).toBe(2);
    expect(comp.loading()).toBe(false);
  });

  it('agrupa ingresos y descuentos via computed', () => {
    const fixture = build();
    flushData(
      boletaData({
        ingresos: [concepto('I1', 'Sueldo', 3500), concepto('I2', 'Movilidad', 100)],
        descuentos: [concepto('D1', 'AFP', 200)],
      }),
    );

    const comp = fixture.componentInstance;
    expect(comp.ingresos().length).toBe(2);
    expect(comp.descuentos().length).toBe(1);
  });

  it('agrupa ESSALUD en aportes empleador y calcula CUC', () => {
    const fixture = build();
    flushData(
      boletaData({
        netoPagar: 3220,
        ingresos: [concepto('I1', 'Remuneración CAS', 6000)],
        descuentos: [concepto('D1', 'AFP total', 783.6)],
        aportes: [concepto('06001', 'ESSALUD 9% (Empleador)', 540)],
      }),
    );
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.aportesEmpleador().length).toBe(1);
    expect(comp.descuentos().length).toBe(1);
    expect(comp.subtotalEssalud()).toBe(540);
    expect(comp.cucTotal()).toBe(3760);
  });

  it('muestra sección de aportes empleador en la boleta', () => {
    const fixture = build();
    flushData(
      boletaData({
        ingresos: [concepto('I1', 'Remuneración CAS', 6000)],
        aportes: [concepto('06001', 'ESSALUD 9% (Empleador)', 540)],
      }),
    );
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Aportes empleador (informativo)');
    expect(el.textContent).toContain('ESSALUD 9% (Empleador)');
    expect(el.textContent).toContain('CUC estimado');
  });

  it('imprimir() llama window.print()', () => {
    const fixture = build();
    flushData();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    fixture.componentInstance.imprimir();
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('descargarPdf() pide el PDF al backend como blob (Spec 011 / B1)', () => {
    const fixture = build();
    flushData();

    fixture.componentInstance.descargarPdf();

    const req = httpMock.expectOne('/api/rrhh/boleta/42/2026-05/pdf');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  });

  it('redirige a /planilla/movimientos si :empleadoId es inválido', () => {
    build('xyz', '2026-05');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  it('redirige si falta :periodo', () => {
    TestBed.configureTestingModule({
      imports: [BoletaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (k: string) => (k === 'empleadoId' ? '42' : null) } },
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(BoletaPageComponent);
    fixture.detectChanges();
    expect(navSpy).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  it('fmtMonto formatea con 2 decimales y fmtFechaCorta produce DD/MM/YYYY', () => {
    const fixture = build();
    flushData();
    const comp = fixture.componentInstance;
    expect(comp.fmtMonto(1234.5)).toMatch(/[.,]50$/);
    expect(comp.fmtFechaCorta('2026-05-13')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(comp.fmtFechaCorta(null)).toBe('—');
  });
});
