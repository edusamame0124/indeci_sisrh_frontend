import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ReportesConsolidadoPageComponent } from './reportes-consolidado-page.component';
import type {
  ReporteEvolucionResponse,
  ReporteRegimenResponse,
  ReporteTopConceptosResponse,
} from '../../models/reporte-consolidado.model';

/**
 * F3.5f — Tests del Tablero Consolidado.
 */
describe('ReportesConsolidadoPageComponent (F3.5)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [ReportesConsolidadoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ReportesConsolidadoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushEvolucion(body: ReporteEvolucionResponse) {
    const req = httpMock.expectOne((r) =>
      r.url === '/api/rrhh/reportes/consolidado/evolucion',
    );
    req.flush({ status: 'OK', mensaje: '', data: body });
  }

  function flushRegimen(body: ReporteRegimenResponse) {
    const req = httpMock.expectOne((r) =>
      r.url === '/api/rrhh/reportes/consolidado/regimen',
    );
    req.flush({ status: 'OK', mensaje: '', data: body });
  }

  function flushTop(body: ReporteTopConceptosResponse) {
    const req = httpMock.expectOne((r) =>
      r.url === '/api/rrhh/reportes/consolidado/top-conceptos',
    );
    req.flush({ status: 'OK', mensaje: '', data: body });
  }

  afterEach(() => {
    httpMock.verify();
  });

  // =====================================================================
  // Test 1 — al iniciar carga Tab 1 (Evolución) automáticamente
  // =====================================================================

  it('al iniciar carga Tab 1 — Evolución', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    flushEvolucion({
      periodoBase: comp.periodoCtrl.value,
      meses: 6,
      totalNetoAcumulado: 12000,
      promedioMensual: 2000,
      variacionPctRango: 5.5,
      items: [
        {
          periodo: '2026-05',
          conteoEmpleados: 10,
          totalIngresos: 25000,
          totalDescuentos: 5000,
          totalNeto: 20000,
          totalAporteEmpleador: 2250,
          conteoNetoNoVa: 0,
          deltaPctNetoVsAnterior: null,
        },
      ],
    });
    expect(comp.evolucion()?.items).toHaveLength(1);
    expect(comp.evolucion()?.totalNetoAcumulado).toBe(12000);
  });

  // =====================================================================
  // Test 2 — cambio de tab dispara la carga del tab nuevo
  // =====================================================================

  it('al cambiar a Tab 2 dispara GET /regimen', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    flushEvolucion({
      periodoBase: comp.periodoCtrl.value, meses: 6,
      totalNetoAcumulado: 0, promedioMensual: 0,
      variacionPctRango: null, items: [],
    });

    comp.onTabChange(1);
    flushRegimen({
      periodo: comp.periodoCtrl.value,
      totalEmpleados: 5,
      totalNeto: 10000,
      items: [
        {
          regimenCodigo: '728',
          regimenNombre: 'DL 728',
          conteoEmpleados: 3,
          totalIngresos: 6500,
          totalDescuentos: 1500,
          totalNeto: 5000,
          netoPromedio: 1666.67,
          porcentajeTotal: 50,
        },
        {
          regimenCodigo: 'CAS',
          regimenNombre: 'DL 1057',
          conteoEmpleados: 2,
          totalIngresos: 6500,
          totalDescuentos: 1500,
          totalNeto: 5000,
          netoPromedio: 2500,
          porcentajeTotal: 50,
        },
      ],
    });
    expect(comp.regimen()?.items).toHaveLength(2);
    expect(comp.regimen()?.totalEmpleados).toBe(5);
  });

  // =====================================================================
  // Test 3 — Tab 3 con cambio de límite dispara recarga
  // =====================================================================

  it('cambiar el límite del top dispara nueva carga', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    flushEvolucion({
      periodoBase: comp.periodoCtrl.value, meses: 6,
      totalNetoAcumulado: 0, promedioMensual: 0,
      variacionPctRango: null, items: [],
    });
    comp.onTabChange(2);
    flushTop({
      periodo: comp.periodoCtrl.value,
      limite: 10,
      totalIngresosPeriodo: 50000,
      items: [
        {
          conceptoPlanillaId: 100,
          codigoMef: '00001',
          nombre: 'Sueldo básico',
          tipoConcepto: 'REMUNERATIVO',
          conteoEmpleados: 25,
          montoTotal: 40000,
          porcentajeIngresos: 80,
        },
      ],
    });
    expect(comp.topConceptos()?.limite).toBe(10);

    comp.limiteCtrl.setValue(20);
    comp.cargarTopConceptos();
    flushTop({
      periodo: comp.periodoCtrl.value,
      limite: 20,
      totalIngresosPeriodo: 50000,
      items: [],
    });
    expect(comp.topConceptos()?.limite).toBe(20);
  });

  // =====================================================================
  // Test 4 — período inválido no dispara HTTP
  // =====================================================================

  it('período inválido no llama backend', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    // Drenar la carga inicial automática.
    flushEvolucion({
      periodoBase: comp.periodoCtrl.value, meses: 6,
      totalNetoAcumulado: 0, promedioMensual: 0,
      variacionPctRango: null, items: [],
    });

    comp.periodoCtrl.setValue('xx');
    comp.cargarEvolucion();
    httpMock.expectNone((r) => r.url === '/api/rrhh/reportes/consolidado/evolucion');
  });

  // =====================================================================
  // Test 5 — helpers de presentación
  // =====================================================================

  it('helpers de presentación: severityDelta + labelTipo + fmtDeltaPct', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    // Drenar la carga inicial automática.
    flushEvolucion({
      periodoBase: comp.periodoCtrl.value, meses: 6,
      totalNetoAcumulado: 0, promedioMensual: 0,
      variacionPctRango: null, items: [],
    });

    expect(comp.severityDelta(5)).toBe('success');
    expect(comp.severityDelta(-3)).toBe('danger');
    expect(comp.severityDelta(0)).toBe('neutral');
    expect(comp.severityDelta(null)).toBe('neutral');

    expect(comp.labelTipo('REMUNERATIVO')).toBe('Remunerativo');
    expect(comp.labelTipo('APORTE_EMPLEADOR')).toBe('Aporte emp.');
    expect(comp.labelTipo(null)).toBe('—');

    expect(comp.fmtDeltaPct(5)).toContain('+');
    expect(comp.fmtDeltaPct(-3)).toContain('−');
    expect(comp.fmtDeltaPct(null)).toBe('—');
  });
});
