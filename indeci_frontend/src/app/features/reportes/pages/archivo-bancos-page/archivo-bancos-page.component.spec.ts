import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ArchivoBancosPageComponent } from './archivo-bancos-page.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type {
  AbonoBancoRow,
  ResumenBancoRow,
} from '../../../planilla/models/abono-banco.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';

describe('ArchivoBancosPageComponent (Spec 010 PANTALLA-07 — Archivo bancos)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [ArchivoBancosPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ArchivoBancosPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  const periodo = (clave: string, estado: 'ABIERTO' | 'CERRADO'): PeriodoPlanillaRow => ({
    id: 1,
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

  const abono = (
    id: number,
    empleadoId: number,
    estado: string,
    monto: number,
  ): AbonoBancoRow => ({
    id,
    movimientoPlanillaId: id * 10,
    empleadoId,
    banco: 'BCP',
    nroCuenta: `191-${id}`,
    cci: `0021910000${id}`,
    meta: '0001',
    montoNeto: monto,
    estado,
    nroTicketMcpp: estado === 'PROCESADO' ? 'MCPP-OLD' : null,
    fechaProcesado: null,
  });

  const bancoRow = (banco: string, abonos: AbonoBancoRow[]): ResumenBancoRow => ({
    banco,
    cantidad: abonos.length,
    totalNeto: abonos.reduce((s, a) => s + a.montoNeto, 0),
    abonos,
  });

  /** Arranca el componente con período + personas + resumen cargados. */
  function conDatos(
    bancos: ResumenBancoRow[] = [
      bancoRow('BCP', [abono(10, 1, 'PENDIENTE', 2610), abono(11, 2, 'PENDIENTE', 1390)]),
      bancoRow('BBVA', [abono(12, 3, 'PROCESADO', 3000)]),
    ],
  ) {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/periodo-planilla')
      .flush({ data: [periodo('2026-05', 'ABIERTO')] });
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(1, 'Ana Lopez'), persona(2, 'Beto Diaz'), persona(3, 'Cesar Paz')] });
    httpMock
      .expectOne('/api/rrhh/abono-banco/resumen-banco/2026-05')
      .flush({ data: bancos });
    return fixture;
  }

  it('al cargar selecciona el periodo ABIERTO y trae el resumen por banco', () => {
    const comp = conDatos().componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.bancos().length).toBe(2);
  });

  it('totales() suma monto, abonos y pendientes de todos los bancos', () => {
    const t = conDatos().componentInstance.totales();
    expect(t.abonos).toBe(3);
    expect(t.pendientes).toBe(2);
    expect(t.monto).toBe(7000);
  });

  it('generarAbonos() hace POST y recarga el resumen', () => {
    const comp = conDatos().componentInstance;
    comp.generarAbonos();

    const req = httpMock.expectOne('/api/rrhh/abono-banco/generar/2026-05');
    expect(req.request.method).toBe('POST');
    req.flush({ data: 3 });

    httpMock.expectOne('/api/rrhh/abono-banco/resumen-banco/2026-05').flush({ data: [] });
    expect(comp.bancos().length).toBe(0);
  });

  it('registrarTicket() hace PUT del ticket del abono y recarga', () => {
    const comp = conDatos().componentInstance;
    const ab = comp.bancos()[0].abonos[0]; // abono 10 PENDIENTE

    comp.registrarTicket(ab, 'MCPP-2026-0001');

    const req = httpMock.expectOne('/api/rrhh/abono-banco/10/ticket');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.nroTicketMcpp).toBe('MCPP-2026-0001');
    req.flush({ data: null });

    httpMock.expectOne('/api/rrhh/abono-banco/resumen-banco/2026-05').flush({ data: [] });
  });

  it('registrarTicketMasivo() envía solo los abonos PENDIENTE del banco', () => {
    const comp = conDatos().componentInstance;
    const bcp = comp.bancos()[0]; // BCP: abonos 10 y 11 PENDIENTE

    comp.registrarTicketMasivo(bcp, 'MCPP-MASIVO-1');

    const req = httpMock.expectOne('/api/rrhh/abono-banco/ticket-masivo');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.abonoIds).toEqual([10, 11]);
    expect(req.request.body.nroTicketMcpp).toBe('MCPP-MASIVO-1');
    req.flush({ data: 2 });

    httpMock.expectOne('/api/rrhh/abono-banco/resumen-banco/2026-05').flush({ data: [] });
  });

  it('descargarArchivoBancario() descarga el ZIP del período (Spec 013 / P-07)', () => {
    const comp = conDatos().componentInstance;
    comp.descargarArchivoBancario();

    const req = httpMock.expectOne('/api/rrhh/archivo-banco/2026-05/zip');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['zip']));
    expect(comp.descargando()).toBe(false);
  });

  it('nombreEmpleado() y dniEmpleado() resuelven desde el catálogo de personas', () => {
    const comp = conDatos().componentInstance;
    expect(comp.nombreEmpleado(2)).toBe('Beto Diaz');
    expect(comp.dniEmpleado(2)).toBe('DNI2');
    expect(comp.nombreEmpleado(99)).toBe('Empleado #99');
  });
});
