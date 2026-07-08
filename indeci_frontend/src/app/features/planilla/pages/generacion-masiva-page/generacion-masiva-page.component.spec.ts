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
import type { PlanillaLoteDashboardRow } from '../../models/planilla-lote.model';

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
    // ngOnInit pide 4 catálogos además de periodos; se flushean vacíos aquí para
    // que cada test solo maneje /periodo-planilla y no falle en httpMock.verify().
    httpMock.expectOne('/api/catalogos/regimenes-laborales').flush({ data: [] });
    httpMock.expectOne('/api/catalogos/tipos-contrato').flush({ data: [] });
    httpMock.expectOne('/api/catalogos/condiciones-laborales').flush({ data: [] });
    httpMock.expectOne('/api/catalogos/modalidades-cas').flush({ data: [] });
    return fixture;
  }

  afterEach(() => {
    // El tab "Historial" dispara GET /planillas-lote/lotes al cargar periodos y
    // tras cada generación; se drenan aquí para que verify() no falle por ellos.
    httpMock
      .match((req) => req.url.endsWith('/planillas-lote/lotes'))
      .forEach((r) => r.flush({ data: [] }));
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
    loteId: null,
  });

  const resultado = (
    total: number,
    exitosos: number,
    fallidos: { empleadoId: number; razon: string }[] = [],
  ): GeneracionMasivaResultado => ({ total, exitosos, fallidos });

  const loteHist = (id: number, regimen: string): PlanillaLoteDashboardRow => ({
    id,
    periodo: '2026-05',
    regimenLaboralCodigo: regimen,
    tipoPlanilla: 'ORDINARIA',
    correlativo: 1,
    estado: 'GENERADO',
    creadoEn: '2026-05-10T09:00:00',
    cantidadEmpleados: 5,
    montoTotalNeto: 1000,
    descripcionConcatenada: `Planilla Ordinaria - ${regimen}`,
  });

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
    // canGenerar exige periodo + régimen + concepto (tipo de planilla).
    comp.regimenSeleccionado.set(1);
    comp.conceptoSeleccionado.set('PLA_HABERES');
    expect(comp.canGenerar()).toBe(true);
    comp.fase.set('generando');
    expect(comp.canGenerar()).toBe(false);
  });

  it('ejecutar: POST masivo → guarda el resultado y recarga movimientos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    fixture.componentInstance.ejecutar('2026-05');

    const postReq = httpMock.expectOne('/api/rrhh/generador-planilla/masivo');
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
      .expectOne('/api/rrhh/generador-planilla/masivo')
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
      .expectOne('/api/rrhh/generador-planilla/masivo')
      .flush({ estado: 'ERROR', mensaje: 'Periodo cerrado', data: null }, {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(fixture.componentInstance.fase()).toBe('idle');
  });

  it('historial: deriva los regímenes presentes y filtra por el seleccionado (1a)', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    const comp = fixture.componentInstance;
    comp.lotesHistorial.set([loteHist(1, '276'), loteHist(2, 'CAS'), loteHist(3, '276')]);

    // Opciones del filtro = solo los regímenes presentes (sin duplicados, ordenados).
    expect([...comp.regimenesEnHistorial()]).toEqual(['276', 'CAS']);
    // Por defecto (null) muestra todos.
    expect(comp.historialRegimenFiltro()).toBeNull();
    expect(comp.lotesHistorialFiltrados().length).toBe(3);
    // Al filtrar por un régimen, solo quedan sus lotes.
    comp.historialRegimenFiltro.set('276');
    expect(comp.lotesHistorialFiltrados().length).toBe(2);
    expect(comp.lotesHistorialFiltrados().every((l) => l.regimenLaboralCodigo === '276')).toBe(true);
  });

  it('declara las columnas de la tabla de resultados en orden esperado', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });

    expect([...fixture.componentInstance.columns]).toEqual([
      'empleadoDni',
      'empleadoNombre',
      'regimenPensionario',
      'dias',
      'totalIngresos',
      'totalDescuentos',
      'netoPagar',
      'estado',
      'acciones',
    ]);
  });
});
