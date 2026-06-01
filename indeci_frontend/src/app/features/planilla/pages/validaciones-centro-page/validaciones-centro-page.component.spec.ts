import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ValidacionesCentroPageComponent } from './validaciones-centro-page.component';
import type {
  PreflightValidacionResponse,
  ValidacionHallazgoRow,
} from '../../models/validacion-hallazgo.model';

/**
 * F3.3f — Tests del Centro de Validaciones.
 */
describe('ValidacionesCentroPageComponent (F3.3)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function build() {
    TestBed.configureTestingModule({
      imports: [ValidacionesCentroPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(ValidacionesCentroPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function hallazgo(
    codigo: string,
    severidad: ValidacionHallazgoRow['severidad'],
    modulo: string,
    extra: Partial<ValidacionHallazgoRow> = {},
  ): ValidacionHallazgoRow {
    return {
      codigo,
      severidad,
      modulo,
      mensaje: `Mensaje ${codigo}`,
      empleadoId: null,
      empleadoNombre: null,
      referenciaId: null,
      ...extra,
    };
  }

  function flush(periodo: string, hallazgos: readonly ValidacionHallazgoRow[]) {
    const req = httpMock.expectOne((r) =>
      r.url === '/api/rrhh/validaciones/preflight' &&
      r.params.get('periodo') === periodo,
    );
    const totalBloqueos = hallazgos.filter((h) => h.severidad === 'BLOQUEO').length;
    const totalAlertas = hallazgos.filter((h) => h.severidad === 'ALERTA').length;
    const totalInfo    = hallazgos.filter((h) => h.severidad === 'INFO').length;
    const body: PreflightValidacionResponse = {
      periodo,
      totalBloqueos,
      totalAlertas,
      totalInfo,
      hallazgos,
    };
    req.flush({ status: 'OK', mensaje: '', data: body });
  }

  afterEach(() => {
    httpMock.verify();
  });

  // =====================================================================
  // Test 1 — período inválido no llama al backend
  // =====================================================================

  it('valida formato YYYY-MM antes de pegarle al backend', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.periodoCtrl.setValue('invalido');
    comp.evaluar();
    httpMock.expectNone('/api/rrhh/validaciones/preflight');
    expect(comp.errorMsg()).toContain('YYYY-MM');
    expect(comp.loading()).toBe(false);
  });

  // =====================================================================
  // Test 2 — KPI populados desde la respuesta
  // =====================================================================

  it('pinta los 3 KPI con conteos del backend', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.periodoCtrl.setValue('2026-05');
    comp.evaluar();
    flush('2026-05', [
      hallazgo('V1', 'BLOQUEO', 'Período'),
      hallazgo('V6', 'BLOQUEO', 'Concepto', { empleadoId: 10, empleadoNombre: 'Pérez J.' }),
      hallazgo('V5', 'ALERTA', 'Empleado', { empleadoId: 11, empleadoNombre: 'Soto M.' }),
      hallazgo('V8', 'INFO', 'Empleado', { empleadoId: 12, empleadoNombre: 'García L.' }),
    ]);
    expect(comp.totalBloqueos()).toBe(2);
    expect(comp.totalAlertas()).toBe(1);
    expect(comp.totalInfo()).toBe(1);
  });

  // =====================================================================
  // Test 3 — filtro severidad multi-chip oculta filas
  // =====================================================================

  it('toggleSeveridad filtra filas en hallazgosFiltrados', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.periodoCtrl.setValue('2026-05');
    comp.evaluar();
    flush('2026-05', [
      hallazgo('V1', 'BLOQUEO', 'Período'),
      hallazgo('V5', 'ALERTA', 'Empleado'),
      hallazgo('V8', 'INFO',   'Empleado'),
    ]);
    expect(comp.hallazgosFiltrados()).toHaveLength(3);

    comp.toggleSeveridad('ALERTA');
    comp.toggleSeveridad('INFO');
    expect(comp.hallazgosFiltrados()).toHaveLength(1);
    expect(comp.hallazgosFiltrados()[0].codigo).toBe('V1');
  });

  // =====================================================================
  // Test 4 — empty con 0 hallazgos
  // =====================================================================

  it('cuando la respuesta no trae hallazgos, totales en 0', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.periodoCtrl.setValue('2026-05');
    comp.evaluar();
    flush('2026-05', []);
    expect(comp.totalBloqueos()).toBe(0);
    expect(comp.result()?.hallazgos).toHaveLength(0);
  });

  // =====================================================================
  // Test 5 — click "ver empleado" navega a Ficha 360
  // =====================================================================

  it('irAEmpleado navega a /empleados/ficha/:id/:periodo', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.periodoCtrl.setValue('2026-05');
    comp.evaluar();
    const h = hallazgo('V6', 'BLOQUEO', 'Concepto', {
      empleadoId: 42,
      empleadoNombre: 'Pérez Juan',
    });
    flush('2026-05', [h]);

    comp.irAEmpleado(h);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/empleados/ficha', 42, '2026-05'],
    );
  });
});
