import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PrestamoMantenimientoPageComponent } from './prestamo-mantenimiento-page.component';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type { PrestamoRow } from '../../models/beneficio.model';

describe('PrestamoMantenimientoPageComponent (Spec 011 / B5)', () => {
  let httpMock: HttpTestingController;

  const fakeDialog = { open: () => ({ afterClosed: () => of(true) }) };

  function build() {
    TestBed.configureTestingModule({
      imports: [PrestamoMantenimientoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    TestBed.overrideComponent(PrestamoMantenimientoPageComponent, {
      add: { providers: [{ provide: MatDialog, useValue: fakeDialog }] },
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PrestamoMantenimientoPageComponent);
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

  const prestamoRow = (id: number, estado: string): PrestamoRow => ({
    id,
    empleadoId: 42,
    descripcion: `Préstamo ${id}`,
    montoTotal: 1200,
    numeroCuotas: 12,
    cuotaMensual: 100,
    cuotasPagadas: 3,
    saldoPendiente: 900,
    estado,
    fechaInicio: null,
  });

  function conEmpleado(prestamos: PrestamoRow[] = [prestamoRow(1, 'ACTIVO')]) {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });
    fixture.componentInstance.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/prestamo/empleado/42').flush({ data: prestamos });
    return fixture;
  }

  it('al cargar lista los empleados con vínculo', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });
    expect(fixture.componentInstance.empleados().length).toBe(2);
  });

  it('al elegir empleado carga sus préstamos', () => {
    const comp = conEmpleado([prestamoRow(1, 'ACTIVO'), prestamoRow(2, 'CANCELADO')])
      .componentInstance;
    expect(comp.prestamos().length).toBe(2);
  });

  it('registrar() hace POST con el préstamo del empleado seleccionado', () => {
    const comp = conEmpleado().componentInstance;
    comp.abrirForm();
    comp.fDescripcion.set('Préstamo administrativo');
    comp.fMontoTotal.set(1200);
    comp.fNumeroCuotas.set(12);
    comp.fCuotaMensual.set(100);

    comp.registrar();

    const req = httpMock.expectOne('/api/rrhh/prestamo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.empleadoId).toBe(42);
    expect(req.request.body.montoTotal).toBe(1200);
    req.flush({ data: null });

    httpMock.expectOne('/api/rrhh/prestamo/empleado/42').flush({ data: [] });
  });

  it('registrarPago() hace PUT del pago de cuota y recarga', () => {
    const comp = conEmpleado().componentInstance;

    comp.registrarPago(comp.prestamos()[0]);

    const req = httpMock.expectOne('/api/rrhh/prestamo/1/pago');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: null });

    httpMock.expectOne('/api/rrhh/prestamo/empleado/42').flush({ data: [] });
  });
});
