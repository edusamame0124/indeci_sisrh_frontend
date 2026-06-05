import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Ficha360PageComponent } from './ficha-360-page.component';
import type { ExplicacionPlanilla } from '../../models/explicacion-planilla.model';

/**
 * F3.1e — Tests del componente Ficha 360.
 */
describe('Ficha360PageComponent (F3.1)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(
    empleadoId: string | null = '42',
    periodo: string | null = '2026-05',
  ) {
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

  function build(
    empleadoId: string | null = '42',
    periodo: string | null = '2026-05',
  ) {
    TestBed.configureTestingModule({
      imports: [Ficha360PageComponent],
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
    const fixture = TestBed.createComponent(Ficha360PageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  // ===================== Routing / inputs =====================

  it('redirige a /planilla/movimientos si falta empleadoId', () => {
    build(null, '2026-05');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  it('redirige si periodo no está presente', () => {
    build('42', null);
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  it('redirige si empleadoId no es numérico válido', () => {
    build('abc', '2026-05');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  // ===================== Carga happy path =====================

  it('llena KPI cards y líneas cuando aplica=true', () => {
    const fixture = build();

    const data: ExplicacionPlanilla = {
      aplica: true,
      empleadoId: 42,
      periodo: '2026-05',
      cabecera: {
        nombreCompleto: 'Juan Pérez',
        dni: '87654321',
        regimenLaboralCodigo: 'CAS',
        regimenLaboralNombre: 'CAS - D.Leg. 1057',
        meta: '0074',
        banco: 'BCP',
        numeroCuenta: '191-1234567',
        cci: '00219100123456789012',
      },
      totales: {
        totalIngresos: 5500.0,
        totalDescuentos: 2435.0,
        aporteTrabajador: 550.0,
        aporteEmpleador: 495.0,
        netoPagar: 3065.0,
        estadoNeto: 'BIEN',
        neto50pctMinimo: 2750.0,
        montoSistemaAirhsp: 5500.0,
        montoAirhsp: 5500.0,
        diferenciaAirhsp: 0.0,
        estadoAirhsp: 'CONCILIADO',
      },
      lineas: [
        {
          grupo: 'INGRESO',
          conceptoPlanillaId: 901,
          codigoMef: '00301',
          codigoSisper: null,
          descripcion: 'Sueldo CAS',
          monto: 5500.0,
          detalle: null,
          observacion: null,
          fuenteTipo: 'EMPLEADO_CONCEPTO',
          fuenteId: 901,
        },
        {
          grupo: 'APORTE_TRABAJADOR',
          conceptoPlanillaId: 902,
          codigoMef: '05002',
          codigoSisper: null,
          descripcion: 'Aporte AFP 10%',
          monto: 550.0,
          detalle: null,
          observacion: null,
          fuenteTipo: 'CONCEPTO_AUTO',
          fuenteId: 902,
        },
        {
          grupo: 'APORTE_EMPLEADOR',
          conceptoPlanillaId: 903,
          codigoMef: '06001',
          codigoSisper: null,
          descripcion: 'ESSALUD 9%',
          monto: 495.0,
          detalle: null,
          observacion: null,
          fuenteTipo: 'CONCEPTO_AUTO',
          fuenteId: 903,
        },
      ],
      snapshots: [
        {
          regla: 'IR4TA_CAS',
          baseCalculo: 1800.0,
          resultado: 144.0,
          formula: '(1800.00) × 0.08 = 144.00',
          versionParametros: '2026',
          parametrosJson: '{"tasa":0.08,"suspensionVigente":false,"baseInafecta":1500}',
        },
      ],
    };

    httpMock
      .expectOne('/api/rrhh/empleado/42/explicacion/2026-05')
      .flush({ data });

    const comp = fixture.componentInstance;
    expect(comp.loading()).toBe(false);
    expect(comp.data()?.aplica).toBe(true);
    expect(comp.data()?.cabecera?.nombreCompleto).toBe('Juan Pérez');
    expect(comp.lineasIngreso()).toHaveLength(1);
    expect(comp.lineasDescuento()).toHaveLength(1);
    expect(comp.lineasAporteEmpleador()).toHaveLength(1);
    // FASE 2 — snapshot de trazabilidad disponible y parseado.
    expect(comp.snapshots()).toHaveLength(1);
    expect(comp.reglaLegible('IR4TA_CAS')).toContain('4.ª categoría');
    const params = comp.parametros(comp.snapshots()[0]);
    expect(params.find((p) => p.etiqueta === 'Tasa')?.valor).toBe('0.08');
    expect(params.find((p) => p.etiqueta === 'Suspensión vigente')?.valor).toBe('No');
    expect(comp.netoSeverity()).toBe('success');
    expect(comp.airhspSeverity()).toBe('success');
  });

  // ===================== Empty state =====================

  it('muestra empty state cuando aplica=false', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: {
        aplica: false,
        empleadoId: 42,
        periodo: '2026-05',
        cabecera: null,
        totales: null,
        lineas: [],
      },
    });
    const comp = fixture.componentInstance;
    expect(comp.loading()).toBe(false);
    expect(comp.data()?.aplica).toBe(false);
    expect(comp.lineasIngreso()).toHaveLength(0);
  });

  // ===================== Severidades de KPI =====================

  it('marca netoSeverity warning cuando estadoNeto = NETO_NO_VA', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: {
        aplica: true,
        empleadoId: 42,
        periodo: '2026-05',
        cabecera: null,
        totales: {
          totalIngresos: 1000,
          totalDescuentos: 600,
          aporteTrabajador: 100,
          aporteEmpleador: 90,
          netoPagar: 400,
          estadoNeto: 'NETO_NO_VA',
          neto50pctMinimo: 500,
          montoSistemaAirhsp: null,
          montoAirhsp: null,
          diferenciaAirhsp: null,
          estadoAirhsp: null,
        },
        lineas: [],
      },
    });
    expect(fixture.componentInstance.netoSeverity()).toBe('warning');
    // Sin AIRHSP → severidad neutral.
    expect(fixture.componentInstance.airhspSeverity()).toBe('neutral');
  });

  it('marca airhspSeverity warning cuando estadoAirhsp = PENDIENTE', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: {
        aplica: true,
        empleadoId: 42,
        periodo: '2026-05',
        cabecera: null,
        totales: {
          totalIngresos: 1000,
          totalDescuentos: 0,
          aporteTrabajador: 0,
          aporteEmpleador: 0,
          netoPagar: 1000,
          estadoNeto: 'BIEN',
          neto50pctMinimo: 500,
          montoSistemaAirhsp: 1000,
          montoAirhsp: 1100,
          diferenciaAirhsp: -100,
          estadoAirhsp: 'PENDIENTE',
        },
        lineas: [],
      },
    });
    expect(fixture.componentInstance.airhspSeverity()).toBe('warning');
  });

  // ===================== Helpers =====================

  it('fmt formatea con separadores de miles y 2 decimales', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: { aplica: false, empleadoId: 42, periodo: '2026-05', lineas: [] },
    });
    const comp = fixture.componentInstance;
    expect(comp.fmt(1234.5)).toBe('1,234.50');
    expect(comp.fmt(0)).toBe('0.00');
    expect(comp.fmt(null)).toBe('0.00');
    expect(comp.fmt(undefined)).toBe('0.00');
  });

  it('signoDe devuelve + para INGRESO, − para DESCUENTO/APORTE_TRAB, · para empleador', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: { aplica: false, empleadoId: 42, periodo: '2026-05', lineas: [] },
    });
    const comp = fixture.componentInstance;
    const base = {
      conceptoPlanillaId: null,
      codigoMef: null,
      codigoSisper: null,
      descripcion: '',
      monto: 0,
      detalle: null,
      observacion: null,
      fuenteTipo: null,
      fuenteId: null,
    };
    expect(comp.signoDe({ ...base, grupo: 'INGRESO' })).toBe('+');
    expect(comp.signoDe({ ...base, grupo: 'DESCUENTO' })).toBe('−');
    expect(comp.signoDe({ ...base, grupo: 'APORTE_TRABAJADOR' })).toBe('−');
    expect(comp.signoDe({ ...base, grupo: 'APORTE_EMPLEADOR' })).toBe('·');
    expect(comp.signoDe({ ...base, grupo: 'INFO' })).toBe('·');
  });

  // ===================== Acciones =====================

  it('irAGenerarPlanilla navega con queryParams correctos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: { aplica: false, empleadoId: 42, periodo: '2026-05', lineas: [] },
    });
    fixture.componentInstance.irAGenerarPlanilla();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/planilla/generacion-individual'],
      { queryParams: { empleadoId: 42, periodo: '2026-05' } },
    );
  });

  it('recargar dispara segunda llamada HTTP', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: { aplica: false, empleadoId: 42, periodo: '2026-05', lineas: [] },
    });
    fixture.componentInstance.recargar();
    httpMock.expectOne('/api/rrhh/empleado/42/explicacion/2026-05').flush({
      data: { aplica: false, empleadoId: 42, periodo: '2026-05', lineas: [] },
    });
  });
});
