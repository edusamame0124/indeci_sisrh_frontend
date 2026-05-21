import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HistorialEmpleadoPageComponent } from './historial-empleado-page.component';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';

describe('HistorialEmpleadoPageComponent (Spec 011 / B6)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [HistorialEmpleadoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HistorialEmpleadoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  const persona = (empleadoId: number, nombre: string): PersonaEmpleado => ({
    id: empleadoId + 1000,
    empleadoId,
    nombreCompleto: nombre,
    dni: `DNI${empleadoId}`,
    email: '',
  });

  const movRow = (periodo: string, neto: number): MovimientoPlanillaRow => ({
    id: Number(periodo.replace('-', '')),
    empleadoId: 42,
    periodo,
    totalIngresos: neto + 400,
    totalDescuentos: 400,
    netoPagar: neto,
    estado: 'PROCESADO',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
  });

  it('al cargar lista los empleados con vínculo', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });
    expect(fixture.componentInstance.empleados().length).toBe(2);
  });

  it('al elegir empleado carga su historial ordenado y suma el neto', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [persona(42, 'Ana Lopez')] });

    fixture.componentInstance.onEmpleadoChange(42);
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/empleado/42')
      .flush({ data: [movRow('2026-04', 800), movRow('2026-05', 900)] });

    const comp = fixture.componentInstance;
    // historial ordenado desc → 2026-05 primero
    expect(comp.historial()[0].periodo).toBe('2026-05');
    expect(comp.totalNeto()).toBe(1700);
  });
});
