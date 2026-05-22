import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { VacacionMantenimientoPageComponent } from './vacacion-mantenimiento-page.component';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type { VacacionSaldoRow } from '../../models/beneficio.model';

describe('VacacionMantenimientoPageComponent (Spec 011 / B5)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [VacacionMantenimientoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(VacacionMantenimientoPageComponent);
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

  const vacRow = (anio: number, saldo: number): VacacionSaldoRow => ({
    id: anio,
    empleadoId: 42,
    anio,
    diasGanados: 30,
    diasGozados: 30 - saldo,
    diasSaldo: saldo,
    observacion: null,
  });

  function conEmpleado(vacaciones: VacacionSaldoRow[] = [vacRow(2026, 22)]) {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });
    fixture.componentInstance.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/vacacion-saldo/empleado/42').flush({ data: vacaciones });
    return fixture;
  }

  it('al cargar lista los empleados con vínculo', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });
    expect(fixture.componentInstance.empleados().length).toBe(2);
  });

  it('al elegir empleado carga sus saldos de vacaciones', () => {
    const comp = conEmpleado([vacRow(2026, 22), vacRow(2025, 5)]).componentInstance;
    expect(comp.vacaciones().length).toBe(2);
  });

  it('guardar() hace POST (UPSERT) con el saldo del empleado seleccionado', () => {
    const comp = conEmpleado().componentInstance;
    comp.abrirForm();
    comp.fAnio.set(2026);
    comp.fGanados.set(30);
    comp.fGozados.set(12);

    comp.guardar();

    const req = httpMock.expectOne('/api/rrhh/vacacion-saldo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.empleadoId).toBe(42);
    expect(req.request.body.anio).toBe(2026);
    expect(req.request.body.diasGozados).toBe(12);
    req.flush({ data: null });

    httpMock.expectOne('/api/rrhh/vacacion-saldo/empleado/42').flush({ data: [] });
  });

  it('editar() precarga el formulario con los datos del año', () => {
    const comp = conEmpleado([vacRow(2026, 22)]).componentInstance;
    comp.editar(comp.vacaciones()[0]);
    expect(comp.mostrarForm()).toBe(true);
    expect(comp.fAnio()).toBe(2026);
    expect(comp.fGanados()).toBe(30);
  });
});
