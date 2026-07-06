import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ResumenMensualPageComponent } from './resumen-mensual-page.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';

describe('ResumenMensualPageComponent (Spec 010 PANTALLA-04 — Resumen general)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [ResumenMensualPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ResumenMensualPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  const periodo = (clave: string, estado: 'ABIERTO' | 'CERRADO'): PeriodoPlanillaRow => ({
    id: clave === '2026-05' ? 1 : 2,
    periodo: clave,
    fechaInicio: `${clave}-01`,
    fechaFin: `${clave}-28`,
    estado,
    observacion: '',
    fechaCierre: null,
    activo: 1,
  });

  const persona = (empleadoId: number, nombre: string): PersonaEmpleado => ({
    id: empleadoId + 1000,
    empleadoId,
    nombreCompleto: nombre,
    dni: `DNI${empleadoId}`,
    email: '',
  });

  const mov = (
    empleadoId: number,
    ingresos: number,
    descuentos: number,
    neto: number,
  ): MovimientoPlanillaRow => ({
    id: empleadoId * 10,
    empleadoId,
    periodo: '2026-05',
    totalIngresos: ingresos,
    totalDescuentos: descuentos,
    netoPagar: neto,
    estado: 'PROCESADO',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
    loteId: null,
  });

  /** Arranca el componente con período actual + anterior cargados. */
  function conDatos(
    actual: MovimientoPlanillaRow[] = [
      mov(42, 1000, 100, 900),
      mov(7, 2000, 200, 1800),
    ],
    anterior: MovimientoPlanillaRow[] = [mov(42, 900, 100, 800)],
  ) {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/periodo-planilla')
      .flush({ data: [periodo('2026-05', 'ABIERTO'), periodo('2026-04', 'CERRADO')] });
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Zacarias Vega'), persona(7, 'Ana Lopez')] });
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05')
      .flush({ data: actual });
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/periodo/2026-04')
      .flush({ data: anterior });
    return fixture;
  }

  it('al cargar selecciona el periodo ABIERTO y detecta el anterior', () => {
    const comp = conDatos().componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.periodoAnterior()).toBe('2026-04');
  });

  it('rows() une movimientos con el nombre del empleado', () => {
    const comp = conDatos().componentInstance;
    const fila = comp.rows().find((r) => r.empleadoId === 7);
    expect(fila?.nombre).toBe('Ana Lopez');
    expect(fila?.ingresos).toBe(2000);
    expect(fila?.neto).toBe(1800);
  });

  it('calcula el comparativo del neto vs el periodo anterior', () => {
    const comp = conDatos().componentInstance;
    const conPrevio = comp.rows().find((r) => r.empleadoId === 42);
    // neto 900 vs anterior 800 → +100 (+12.5 %)
    expect(conPrevio?.deltaNeto).toBe(100);
    expect(conPrevio?.deltaPct).toBe(12.5);
    // empleado 7 no estaba en el periodo anterior → sin delta
    const sinPrevio = comp.rows().find((r) => r.empleadoId === 7);
    expect(sinPrevio?.netoAnterior).toBeNull();
    expect(sinPrevio?.deltaNeto).toBeNull();
  });

  it('totales() suma cada columna sobre todo el periodo', () => {
    const t = conDatos().componentInstance.totales();
    expect(t.ingresos).toBe(3000);
    expect(t.descuentos).toBe(300);
    expect(t.neto).toBe(2700);
  });

  it('onSort() reordena las filas por la columna elegida', () => {
    const comp = conDatos().componentInstance;
    // Orden por defecto: nombre asc → Ana Lopez (7) primero
    expect(comp.rowsOrdenadas()[0].empleadoId).toBe(7);
    // Orden por neto asc → 900 (emp 42) primero
    comp.onSort('neto');
    expect(comp.rowsOrdenadas()[0].empleadoId).toBe(42);
    // Segundo clic invierte la dirección
    comp.onSort('neto');
    expect(comp.sortDir()).toBe('desc');
    expect(comp.rowsOrdenadas()[0].empleadoId).toBe(7);
  });

  it('construirCsv() incluye encabezado, filas y fila de totales', () => {
    const csv = conDatos().componentInstance.construirCsv();
    const lineas = csv.split('\r\n');
    expect(lineas[0]).toBe('Empleado;Ingresos;Descuentos;Neto;Neto anterior;Delta neto;Delta %');
    expect(lineas[lineas.length - 1]).toBe('TOTALES;3000.00;300.00;2700.00;;;');
    expect(csv).toContain('"Ana Lopez"');
  });

  it('sin periodo anterior no pide movimientos previos y el delta queda nulo', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/periodo-planilla')
      .flush({ data: [periodo('2026-05', 'ABIERTO')] });
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [persona(42, 'Zacarias Vega')] });
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05')
      .flush({ data: [mov(42, 1000, 100, 900)] });

    const comp = fixture.componentInstance;
    expect(comp.periodoAnterior()).toBeNull();
    expect(comp.rows()[0].deltaNeto).toBeNull();
  });
});
