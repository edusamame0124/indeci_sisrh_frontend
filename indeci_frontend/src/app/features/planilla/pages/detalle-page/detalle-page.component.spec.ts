import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DetallePageComponent } from './detalle-page.component';
import type { PlanillaDetalleRow } from '../../models/planilla-detalle.model';

describe('DetallePageComponent (Spec 009 T156 + Spec 010 PANTALLA-03)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  const RESUMEN_URL = '/api/rrhh/generador-planilla/resumen/42/2026-05';

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
      imports: [DetallePageComponent],
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
    const fixture = TestBed.createComponent(DetallePageComponent);
    fixture.detectChanges();
    return fixture;
  }

  const detalleIngreso = (id: number, monto: number, concepto: string): PlanillaDetalleRow => ({
    id,
    conceptoPlanillaId: id * 10,
    codigoConcepto: `INGR_${id}`,
    concepto,
    tipoConcepto: 'INGRESO',
    monto,
    cantidad: 1,
    observacion: null,
  });

  const detalleDescuento = (id: number, monto: number, concepto: string): PlanillaDetalleRow => ({
    id,
    conceptoPlanillaId: id * 10,
    codigoConcepto: `DESC_${id}`,
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

  const resumen = (estadoNeto: string | null, netoPagar = 3220, neto50 = 1610) => ({
    empleadoId: 42,
    periodo: '2026-05',
    totalIngresos: 3700,
    totalDescuentos: 480,
    netoPagar,
    neto50pctMinimo: neto50,
    estadoNeto,
  });

  /** Responde el GET del resumen (catchError lo absorbe si se manda error). */
  function flushResumen(data: ReturnType<typeof resumen> | null) {
    const req = httpMock.expectOne(RESUMEN_URL);
    if (data === null) {
      req.flush({ estado: 'ERROR', mensaje: 'Planilla no encontrada', data: null },
        { status: 404, statusText: 'Not Found' });
    } else {
      req.flush({ data });
    }
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('carga persona + detalle + resumen por :empId/:periodo en paralelo', () => {
    const fixture = build('42', '2026-05');

    httpMock.expectOne('/api/rrhh/persona').flush({
      data: [{ id: 7, empleadoId: 42, nombreCompleto: 'Ana Pérez', dni: '11223344', email: 'a@b.pe' }],
    });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({
      data: [detalleIngreso(1, 3000, 'Sueldo'), detalleDescuento(2, 300, 'AFP')],
    });
    flushResumen(resumen('BIEN'));

    const comp = fixture.componentInstance;
    expect(comp.persona()?.nombreCompleto).toBe('Ana Pérez');
    expect(comp.filas().length).toBe(2);
  });

  it('agrupa correctamente en ingresos y descuentos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({
      data: [
        detalleIngreso(1, 3000, 'Sueldo'),
        detalleIngreso(2, 200, 'Asignación familiar'),
        detalleDescuento(3, 320, 'AFP'),
        detalleDescuento(4, 80, 'Seguro'),
      ],
    });
    flushResumen(null);

    const comp = fixture.componentInstance;
    expect(comp.ingresos().length).toBe(2);
    expect(comp.descuentos().length).toBe(2);
  });

  it('subtotales y neto se calculan correctamente', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({
      data: [
        detalleIngreso(1, 3500, 'Sueldo'),
        detalleIngreso(2, 200, 'Movilidad'),
        detalleDescuento(3, 380, 'AFP'),
        detalleDescuento(4, 100, 'Otros'),
      ],
    });
    flushResumen(null);

    const comp = fixture.componentInstance;
    expect(comp.subtotalIngresos()).toBe(3700);
    expect(comp.subtotalDescuentos()).toBe(480);
    expect(comp.netoPagar()).toBe(3220);
  });

  it('agrupa ESSALUD en aportes empleador y no en descuentos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({
      data: [
        detalleIngreso(1, 6000, 'Remuneración CAS'),
        detalleDescuento(2, 600, 'Aporte AFP 10%'),
        detalleAporte(3, 540, 'ESSALUD 9% (Empleador)'),
      ],
    });
    flushResumen(null);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.aportesEmpleador().length).toBe(1);
    expect(comp.descuentos().length).toBe(1);
    expect(comp.aportesEmpleador()[0]?.concepto).toContain('ESSALUD');
    expect(comp.subtotalEssalud()).toBe(540);
  });

  it('calcula CUC como neto + subtotal ESSALUD', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({
      data: [
        detalleIngreso(1, 6000, 'Remuneración CAS'),
        detalleDescuento(2, 783.6, 'AFP total'),
        detalleAporte(3, 540, 'ESSALUD 9% (Empleador)'),
      ],
    });
    flushResumen(null);

    const comp = fixture.componentInstance;
    expect(comp.netoPagar()).toBe(5216.4);
    expect(comp.cucTotal()).toBe(5756.4);
  });

  it('muestra empty state cuando no hay aportes empleador', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({
      data: [detalleIngreso(1, 3000, 'Sueldo')],
    });
    flushResumen(null);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No hay aportes empleador registrados');
    expect(fixture.componentInstance.aportesEmpleador().length).toBe(0);
  });

  it('semáforo = "ok" cuando estadoNeto = BIEN', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({ data: [] });
    flushResumen(resumen('BIEN'));

    expect(fixture.componentInstance.estadoNeto()).toBe('BIEN');
    expect(fixture.componentInstance.semaforo()).toBe('ok');
  });

  it('semáforo = "rojo" cuando estadoNeto = NETO_NO_VA', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({ data: [] });
    flushResumen(resumen('NETO_NO_VA', 1210, 1305));

    expect(fixture.componentInstance.estadoNeto()).toBe('NETO_NO_VA');
    expect(fixture.componentInstance.semaforo()).toBe('rojo');
  });

  it('semáforo = "neutro" cuando no hay resumen disponible', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05').flush({ data: [] });
    flushResumen(null);

    expect(fixture.componentInstance.estadoNeto()).toBeNull();
    expect(fixture.componentInstance.semaforo()).toBe('neutro');
  });

  it('redirige a /planilla/movimientos si :empleadoId es inválido', () => {
    build('abc', '2026-05');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  it('redirige si falta :periodo en la URL', () => {
    TestBed.configureTestingModule({
      imports: [DetallePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (k: string) => (k === 'empleadoId' ? '42' : null) },
            },
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(DetallePageComponent);
    fixture.detectChanges();
    expect(navSpy).toHaveBeenCalledWith(['/planilla/movimientos']);
  });
});
