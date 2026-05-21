import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { GeneracionMasivaPageComponent } from './generacion-masiva-page.component';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';
import type { GeneracionMasivaResultado } from '../../models/generacion-masiva.model';

describe('GeneracionMasivaPageComponent (Spec 009 / T153, Spec 011 / C2)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [GeneracionMasivaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GeneracionMasivaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  const periodoAbierto = (clave: string = '2026-05'): PeriodoPlanillaRow => ({
    id: 1,
    periodo: clave,
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-31',
    estado: 'ABIERTO',
    observacion: '',
    fechaCierre: null,
    activo: 1,
  });

  const periodoCerrado = (clave: string = '2026-04'): PeriodoPlanillaRow => ({
    ...periodoAbierto(clave),
    id: 2,
    estado: 'CERRADO',
  });

  const movFila = (id: number, empleadoId: number): MovimientoPlanillaRow => ({
    id,
    empleadoId,
    periodo: '2026-05',
    totalIngresos: 1000,
    totalDescuentos: 100,
    netoPagar: 900,
    estado: 'PROCESADO',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
  });

  const resultado = (
    total: number,
    exitosos: number,
    fallidos: { empleadoId: number; razon: string }[] = [],
  ): GeneracionMasivaResultado => ({ total, exitosos, fallidos });

  it('selecciona el primer periodo ABIERTO por defecto', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({
      data: [periodoAbierto('2026-05'), periodoCerrado('2026-04')],
    });

    const comp = fixture.componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.periodosAbiertos().length).toBe(1);
  });

  it('si no hay periodos ABIERTOS deja la página sin selección', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({
      data: [periodoCerrado('2026-04')],
    });

    const comp = fixture.componentInstance;
    expect(comp.periodosAbiertos().length).toBe(0);
    expect(comp.periodoSeleccionado()).toBeNull();
    expect(comp.canGenerar()).toBe(false);
  });

  it('canGenerar() es false durante "generando"', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    const comp = fixture.componentInstance;
    expect(comp.canGenerar()).toBe(true);
    comp.fase.set('generando');
    expect(comp.canGenerar()).toBe(false);
  });

  it('ejecutar: POST masivo → guarda el resultado y recarga movimientos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    fixture.componentInstance.ejecutar('2026-05');

    const postReq = httpMock.expectOne('/api/rrhh/generador-planilla/masivo/2026-05');
    expect(postReq.request.method).toBe('POST');
    expect(fixture.componentInstance.fase()).toBe('generando');
    postReq.flush({ data: resultado(2, 2, []) });

    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({
      data: [movFila(10, 42), movFila(11, 43)],
    });

    const comp = fixture.componentInstance;
    expect(comp.fase()).toBe('completado');
    expect(comp.resultado()?.exitosos).toBe(2);
    expect(comp.movimientosPost().length).toBe(2);
  });

  it('ejecutar: el resultado expone los fallidos con empleadoId y razón (C2)', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    fixture.componentInstance.ejecutar('2026-05');
    httpMock
      .expectOne('/api/rrhh/generador-planilla/masivo/2026-05')
      .flush({
        data: resultado(3, 2, [{ empleadoId: 99, razon: 'Empleado sin configuración planilla' }]),
      });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });

    const r = fixture.componentInstance.resultado();
    expect(r?.total).toBe(3);
    expect(r?.fallidos.length).toBe(1);
    expect(r?.fallidos[0].empleadoId).toBe(99);
    expect(r?.fallidos[0].razon).toContain('configuración');
  });

  it('ejecutar: si el POST falla, vuelve a fase "idle"', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    fixture.componentInstance.ejecutar('2026-05');
    httpMock
      .expectOne('/api/rrhh/generador-planilla/masivo/2026-05')
      .flush({ estado: 'ERROR', mensaje: 'Periodo cerrado', data: null }, {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(fixture.componentInstance.fase()).toBe('idle');
  });

  it('declara las 5 columnas en orden esperado', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    expect([...fixture.componentInstance.columns]).toEqual([
      'empleadoId',
      'totalIngresos',
      'totalDescuentos',
      'netoPagar',
      'estado',
    ]);
  });
});
