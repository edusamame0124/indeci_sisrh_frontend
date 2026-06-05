import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MovimientosPageComponent, ESTADOS_MOVIMIENTO } from './movimientos-page.component';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';

describe('MovimientosPageComponent (Spec 009 T155 + Spec 010 PANTALLA-01)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [MovimientosPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MovimientosPageComponent);
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

  const movFila = (
    id: number,
    empleadoId: number,
    estado: string,
    estadoNeto: string | null = 'BIEN',
    extra: Partial<MovimientoPlanillaRow> = {},
  ): MovimientoPlanillaRow => ({
    id,
    empleadoId,
    periodo: '2026-05',
    totalIngresos: 1000,
    totalDescuentos: 100,
    netoPagar: 900,
    estado,
    observacion: null,
    activo: 1,
    neto50pctMinimo: 450,
    estadoNeto,
    ...extra,
  });

  it('al cargar pide periodos y selecciona el primer ABIERTO por defecto', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({
      data: [periodoCerrado('2026-04'), periodoAbierto('2026-05')],
    });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });

    const comp = fixture.componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.periodoActivo()?.estado).toBe('ABIERTO');
  });

  it('si no hay periodos ABIERTOS, selecciona el más reciente (CERRADO)', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({
      data: [periodoCerrado('2026-03'), periodoCerrado('2026-04')],
    });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-04').flush({ data: [] });

    expect(fixture.componentInstance.periodoSeleccionado()).toBe('2026-04');
  });

  it('si no hay periodos, queda en estado vacío sin pedir movimientos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [] });

    const comp = fixture.componentInstance;
    expect(comp.periodos().length).toBe(0);
    expect(comp.periodoSeleccionado()).toBeNull();
    expect(comp.loading()).toBe(false);
  });

  it('cambia periodo en el selector y recarga movimientos', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({
      data: [periodoAbierto('2026-05'), periodoCerrado('2026-04')],
    });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });

    fixture.componentInstance.onPeriodoChange('2026-04');
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-04').flush({
      data: [movFila(10, 42, 'PROCESADO')],
    });

    expect(fixture.componentInstance.periodoSeleccionado()).toBe('2026-04');
    expect(fixture.componentInstance.rows().length).toBe(1);
  });

  it('estadosOtros() omite el estado actual de la fila', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });

    const otros = fixture.componentInstance.estadosOtros(movFila(10, 42, 'PROCESADO'));
    expect(otros).not.toContain('PROCESADO');
    expect(otros.length).toBe(ESTADOS_MOVIMIENTO.length - 1);
  });

  it('cambiarEstado() hace PUT y recarga el listado del periodo', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({
      data: [movFila(10, 42, 'PROCESADO')],
    });

    fixture.componentInstance.cambiarEstado(movFila(10, 42, 'PROCESADO'), 'ANULADO');

    const putReq = httpMock.expectOne('/api/rrhh/movimiento-planilla/10/estado/ANULADO');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ data: null });

    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });
  });

  it('declara las 10 columnas en orden esperado (incluye identificacion y acciones)', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });

    expect([...fixture.componentInstance.columns]).toEqual([
      'empleado',
      'empleadoDni',
      'regimenLaboral',
      'totalIngresos',
      'totalDescuentos',
      'netoPagar',
      'semaforo',
      'estado',
      'observacion',
      'acciones',
    ]);
  });

  it('muestra nombre, DNI y tipo de regimen del empleado en la tabla', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({
      data: [
        movFila(10, 42, 'PROCESADO', 'BIEN', {
          empleadoNombre: 'Ana Isabel Salas Ramos',
          empleadoDni: '44552584',
          regimenLaboralCodigo: '1057',
          regimenLaboralNombre: 'CAS',
        }),
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Ana Isabel Salas Ramos');
    expect(root.textContent).toContain('44552584');
    expect(root.textContent).toContain('1057 - CAS');
  });

  it('cada fila tiene routerLinks a resumen y detalle con empleadoId+periodo', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({
      data: [movFila(10, 42, 'PROCESADO')],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a[href="/planilla/resumen/42/2026-05"]')).not.toBeNull();
    expect(root.querySelector('a[href="/planilla/detalle/42/2026-05"]')).not.toBeNull();
  });

  // ============ Spec 010 / PANTALLA-01 — semáforo ESTADO_NETO ============

  it('semaforoDe() mapea estadoNeto a ok / rojo / neutro', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({ data: [] });

    const comp = fixture.componentInstance;
    expect(comp.semaforoDe(movFila(1, 1, 'PROCESADO', 'BIEN'))).toBe('ok');
    expect(comp.semaforoDe(movFila(2, 2, 'REVISAR', 'NETO_NO_VA'))).toBe('rojo');
    expect(comp.semaforoDe(movFila(3, 3, 'GENERADO', null))).toBe('neutro');
  });

  it('resumenSemaforo() cuenta verde / rojo / neutro del periodo', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({
      data: [
        movFila(1, 1, 'PROCESADO', 'BIEN'),
        movFila(2, 2, 'PROCESADO', 'BIEN'),
        movFila(3, 3, 'REVISAR', 'NETO_NO_VA'),
        movFila(4, 4, 'GENERADO', null),
      ],
    });

    const r = fixture.componentInstance.resumenSemaforo();
    expect(r.verde).toBe(2);
    expect(r.rojo).toBe(1);
    expect(r.neutro).toBe(1);
  });

  it('el filtro de semáforo NETO_NO_VA reduce rowsFiltradas', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05').flush({
      data: [
        movFila(1, 1, 'PROCESADO', 'BIEN'),
        movFila(3, 3, 'REVISAR', 'NETO_NO_VA'),
      ],
    });

    const comp = fixture.componentInstance;
    expect(comp.rowsFiltradas().length).toBe(2);

    comp.onFiltroSemaforo('NETO_NO_VA');
    expect(comp.rowsFiltradas().length).toBe(1);
    expect(comp.rowsFiltradas()[0].id).toBe(3);
  });
});
