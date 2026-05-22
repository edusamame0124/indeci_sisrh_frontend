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
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';
import type { PlanillaDetalleRow } from '../../../planilla/models/planilla-detalle.model';

describe('BoletaPageComponent (Spec 009 / T160 — FR-R2)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(empleadoId: string = '42', periodo: string = '2026-05') {
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

  function build(empleadoId: string = '42', periodo: string = '2026-05') {
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

  const movimiento = (): MovimientoPlanillaRow => ({
    id: 100,
    empleadoId: 42,
    periodo: '2026-05',
    totalIngresos: 3700,
    totalDescuentos: 480,
    netoPagar: 3220,
    estado: 'PROCESADO',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
  });

  const detalleIngreso = (id: number, monto: number, concepto: string): PlanillaDetalleRow => ({
    id,
    conceptoPlanillaId: id * 10,
    codigoConcepto: `I_${id}`,
    concepto,
    tipoConcepto: 'INGRESO',
    monto,
    cantidad: 1,
    observacion: null,
  });

  const detalleDescuento = (id: number, monto: number, concepto: string): PlanillaDetalleRow => ({
    id,
    conceptoPlanillaId: id * 10,
    codigoConcepto: `D_${id}`,
    concepto,
    tipoConcepto: 'DESCUENTO',
    monto,
    cantidad: 1,
    observacion: null,
  });

  const detalleAporte = (id: number, monto: number, concepto: string): PlanillaDetalleRow => ({
    id,
    conceptoPlanillaId: id * 10,
    codigoConcepto: '06001',
    concepto,
    tipoConcepto: 'APORTE',
    monto,
    cantidad: 1,
    observacion: null,
  });

  function flushBoot(opts?: { detalle?: PlanillaDetalleRow[] }) {
    httpMock.expectOne('/api/rrhh/persona').flush({
      data: [
        { id: 7, empleadoId: 42, nombreCompleto: 'Ana Pérez', dni: '11223344', email: 'ana@indeci.gob.pe', codigoInterno: 'IND-A001', estado: 'ACTIVO' },
      ],
    });
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/42/2026-05')
      .flush({ data: movimiento() });
    httpMock
      .expectOne('/api/rrhh/planilla-detalle/42/2026-05')
      .flush({ data: opts?.detalle ?? [] });
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('compone los 3 GET (persona + movimiento + detalle) en paralelo (FR-R2)', () => {
    const fixture = build();
    flushBoot({
      detalle: [
        detalleIngreso(1, 3500, 'Sueldo básico'),
        detalleIngreso(2, 200, 'Asignación movilidad'),
        detalleDescuento(3, 380, 'Aporte AFP'),
        detalleDescuento(4, 100, 'Otros descuentos'),
      ],
    });

    const comp = fixture.componentInstance;
    expect(comp.persona()?.nombreCompleto).toBe('Ana Pérez');
    expect(comp.movimiento()?.netoPagar).toBe(3220);
    expect(comp.detalle().length).toBe(4);
    expect(comp.loading()).toBe(false);
  });

  it('agrupa ingresos y descuentos via computed', () => {
    const fixture = build();
    flushBoot({
      detalle: [
        detalleIngreso(1, 3500, 'Sueldo'),
        detalleDescuento(2, 200, 'AFP'),
        detalleIngreso(3, 100, 'Movilidad'),
      ],
    });

    const comp = fixture.componentInstance;
    expect(comp.ingresos().length).toBe(2);
    expect(comp.descuentos().length).toBe(1);
  });

  it('agrupa ESSALUD en aportes empleador y calcula CUC', () => {
    const fixture = build();
    flushBoot({
      detalle: [
        detalleIngreso(1, 6000, 'Remuneración CAS'),
        detalleDescuento(2, 783.6, 'AFP total'),
        detalleAporte(3, 540, 'ESSALUD 9% (Empleador)'),
      ],
    });
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.aportesEmpleador().length).toBe(1);
    expect(comp.descuentos().length).toBe(1);
    expect(comp.subtotalEssalud()).toBe(540);
    expect(comp.cucTotal()).toBe(3760);
  });

  it('muestra sección de aportes empleador en la boleta', () => {
    const fixture = build();
    flushBoot({
      detalle: [
        detalleIngreso(1, 6000, 'Remuneración CAS'),
        detalleAporte(2, 540, 'ESSALUD 9% (Empleador)'),
      ],
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Aportes empleador (informativo)');
    expect(el.textContent).toContain('ESSALUD 9% (Empleador)');
    expect(el.textContent).toContain('CUC estimado');
  });

  it('imprimir() llama window.print()', () => {
    const fixture = build();
    flushBoot();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    fixture.componentInstance.imprimir();
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('descargarPdf() pide el PDF al backend como blob (Spec 011 / B1)', () => {
    const fixture = build();
    flushBoot();

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
    flushBoot();
    const comp = fixture.componentInstance;
    expect(comp.fmtMonto(1234.5)).toMatch(/[.,]50$/);
    expect(comp.fmtFechaCorta('2026-05-13')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(comp.fmtFechaCorta(null)).toBe('—');
  });
});
