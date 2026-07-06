import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PortalEmpleadoPageComponent } from './portal-empleado-page.component';
import { AuthService } from '../../../../core/services/auth.service';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';
import type { PrestamoRow, VacacionSaldoRow } from '../../models/portal-empleado.model';
import type { AsistenciaResponse } from '../../../asistencia/models/asistencia.model';

describe('PortalEmpleadoPageComponent (Spec 010 PANTALLA-08 — Portal del empleado)', () => {
  let httpMock: HttpTestingController;
  /** Empleado vinculado a la cuenta logueada (Spec 011 / B2); null = sin vínculo. */
  let empleadoVinculado: number | null;

  // AuthService falso: solo expone empleadoId() — el portal no usa más.
  const fakeAuth = { empleadoId: () => empleadoVinculado };

  beforeEach(() => {
    empleadoVinculado = null;
  });

  function build() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PortalEmpleadoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        { provide: AuthService, useValue: fakeAuth },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PortalEmpleadoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  const persona = (empleadoId: number, nombre: string): PersonaEmpleado => ({
    id: empleadoId + 1000,
    empleadoId,
    nombreCompleto: nombre,
    dni: `DNI${empleadoId}`,
    email: `emp${empleadoId}@indeci.gob.pe`,
    telefono: '999000111',
  });

  const movRow = (periodo: string, neto: number): MovimientoPlanillaRow => ({
    id: Number(periodo.replace('-', '')),
    empleadoId: 42,
    periodo,
    totalIngresos: neto + 500,
    totalDescuentos: 500,
    netoPagar: neto,
    estado: 'PROCESADO',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
    loteId: null,
  });

  const prestamoRow = (id: number, estado: string, saldo: number): PrestamoRow => ({
    id,
    empleadoId: 42,
    descripcion: `Préstamo ${id}`,
    montoTotal: 1200,
    numeroCuotas: 12,
    cuotaMensual: 100,
    cuotasPagadas: 3,
    saldoPendiente: saldo,
    estado,
    fechaInicio: null,
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

  const asistencia = (): AsistenciaResponse => ({
    id: 91,
    empleadoId: 42,
    periodo: '2026-05',
    remuneracionBase: 2500,
    diasLaborados: 2,
    diasFalta: 1,
    totalMinTardanza: 20,
    descuentoTardanza: 3.47,
    descuentoFalta: 83.33,
    estado: 'VALIDADA',
    observacion: null,
    dias: [
      {
        dia: '2026-05-01',
        tipoDia: 'TARDANZA',
        minutosTardanza: 20,
        observacion: null,
        marcaEntrada: '08:20',
        marcaSalida: '17:30',
      },
      {
        dia: '2026-05-02',
        tipoDia: 'LABORAL',
        minutosTardanza: 0,
        observacion: null,
        marcaEntrada: '08:00',
        marcaSalida: '17:30',
      },
      {
        dia: '2026-05-03',
        tipoDia: 'FALTA',
        minutosTardanza: 0,
        observacion: null,
        marcaEntrada: null,
        marcaSalida: null,
      },
    ],
  });

  /** Arranca el componente y selecciona el empleado 42 con sus datos. */
  function conEmpleado(
    movimientos: MovimientoPlanillaRow[] = [movRow('2026-05', 900), movRow('2026-04', 800)],
    prestamos: PrestamoRow[] = [
      prestamoRow(1, 'ACTIVO', 900),
      prestamoRow(2, 'ACTIVO', 500),
      prestamoRow(3, 'CANCELADO', 0),
    ],
    vacaciones: VacacionSaldoRow[] = [vacRow(2026, 22), vacRow(2025, 10)],
  ) {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });

    fixture.componentInstance.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/movimiento-planilla/empleado/42').flush({ data: movimientos });
    httpMock.expectOne('/api/rrhh/prestamo/empleado/42').flush({ data: prestamos });
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

  it('al elegir empleado carga su historial y calcula el comparativo del neto', () => {
    const comp = conEmpleado().componentInstance;
    expect(comp.datosListos()).toBe(true);
    // historial ordenado desc → 2026-05 primero
    expect(comp.ultimoMovimiento()?.periodo).toBe('2026-05');
    // 900 − 800 = +100
    expect(comp.deltaNeto()).toBe(100);
  });

  it('saldoPrestamos() suma el saldo pendiente solo de los préstamos ACTIVO', () => {
    const comp = conEmpleado().componentInstance;
    // 900 + 500 (los ACTIVO); el CANCELADO no suma
    expect(comp.saldoPrestamos()).toBe(1400);
  });

  it('saldoVacacionVigente() toma el año más reciente', () => {
    const comp = conEmpleado().componentInstance;
    expect(comp.saldoVacacionVigente()?.anio).toBe(2026);
    expect(comp.saldoVacacionVigente()?.diasSaldo).toBe(22);
  });

  it('guardarContacto() hace PUT a /persona con el correo editado', () => {
    const comp = conEmpleado().componentInstance;
    comp.emailEdit.set('nuevo@indeci.gob.pe');

    comp.guardarContacto();

    const req = httpMock.expectOne('/api/rrhh/persona/1042'); // id persona = 42 + 1000
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.email).toBe('nuevo@indeci.gob.pe');
    req.flush({ data: null });

    // recarga personas tras guardar
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [persona(42, 'Ana Lopez')] });
  });

  it('si la cuenta está vinculada a un empleado, abre su portal automáticamente (Spec 011 / B2)', () => {
    empleadoVinculado = 42;
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(42, 'Ana Lopez'), persona(7, 'Beto Diaz')] });

    // auto-selección del empleado vinculado → carga sus datos
    httpMock.expectOne('/api/rrhh/movimiento-planilla/empleado/42').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/prestamo/empleado/42').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/vacacion-saldo/empleado/42').flush({ data: [] });

    expect(fixture.componentInstance.empleadoSeleccionado()).toBe(42);
  });

  it('consulta Mi asistencia y muestra calendario readonly con PDF propio', () => {
    const fixture = conEmpleado();
    const comp = fixture.componentInstance;
    comp.asistenciaPeriodo.set('2026-05');

    comp.consultarMiAsistencia();
    httpMock.expectOne('/api/portal/asistencia/2026-05').flush({ data: asistencia() });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(comp.asistenciaSemanas().length).toBeGreaterThan(0);
    expect(text).toContain('VALIDADA');
    expect(text).toContain('TARDANZA');
    expect(text).toContain('Entrada: 08:20');
    expect(comp.asistenciaPdfUrl()).toBe('/api/portal/asistencia/2026-05/pdf');
  });
});
