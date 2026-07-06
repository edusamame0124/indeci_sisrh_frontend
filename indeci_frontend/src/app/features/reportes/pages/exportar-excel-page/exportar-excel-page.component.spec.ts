import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ExportarExcelPageComponent } from './exportar-excel-page.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';

describe('ExportarExcelPageComponent (Spec 011 / B6)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [ExportarExcelPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ExportarExcelPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  const periodo = (clave: string): PeriodoPlanillaRow => ({
    id: 1,
    periodo: clave,
    fechaInicio: `${clave}-01`,
    fechaFin: `${clave}-28`,
    estado: 'ABIERTO',
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

  const mov = (empleadoId: number, neto: number): MovimientoPlanillaRow => ({
    id: empleadoId * 10,
    empleadoId,
    periodo: '2026-05',
    totalIngresos: neto + 400,
    totalDescuentos: 400,
    netoPagar: neto,
    estado: 'PROCESADO',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
    loteId: null,
  });

  function conDatos(movimientos: MovimientoPlanillaRow[] = [mov(42, 900), mov(7, 1800)]) {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodo('2026-05')] });
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05')
      .flush({ data: movimientos });
    return fixture;
  }

  it('al cargar selecciona el periodo y arma las filas con nombres', () => {
    const comp = conDatos().componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.filas().length).toBe(2);
    // ordenadas por nombre: Ana Lopez primero
    expect(comp.filas()[0].empleado).toBe('Ana Lopez');
  });

  it('construirCsv() arma encabezado + una fila por empleado', () => {
    const csv = conDatos().componentInstance.construirCsv();
    const lineas = csv.split('\r\n');
    expect(lineas[0]).toBe('Empleado;Ingresos;Descuentos;Neto;Estado');
    expect(lineas.length).toBe(3); // encabezado + 2 empleados
    expect(csv).toContain('"Ana Lopez"');
  });
});
