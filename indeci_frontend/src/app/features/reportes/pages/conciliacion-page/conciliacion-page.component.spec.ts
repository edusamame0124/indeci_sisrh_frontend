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
import { ConciliacionPageComponent } from './conciliacion-page.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { ConciliacionAirhspRow } from '../../../planilla/models/conciliacion-airhsp.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { ConciliacionRevisionResult } from './conciliacion-revision-dialog.component';

describe('ConciliacionPageComponent (Spec 010 PANTALLA-06 — Conciliación AIRHSP)', () => {
  let httpMock: HttpTestingController;
  let dialogResult: ConciliacionRevisionResult | undefined;

  // MatDialog falso: open() devuelve el resultado configurado por el test.
  const fakeDialog = {
    open: () => ({ afterClosed: () => of(dialogResult) }),
  };

  function build() {
    dialogResult = undefined;
    TestBed.configureTestingModule({
      imports: [ConciliacionPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    // El componente importa MatDialogModule (proveedor propio); el override
    // debe ir a nivel de componente para que gane sobre el del módulo.
    TestBed.overrideComponent(ConciliacionPageComponent, {
      add: { providers: [{ provide: MatDialog, useValue: fakeDialog }] },
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ConciliacionPageComponent);
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

  const conc = (
    id: number,
    empleadoId: number,
    estado: string,
    montoSistema: number,
    montoAirhsp: number,
  ): ConciliacionAirhspRow => ({
    id,
    empleadoId,
    registroAirhsp: `00013${id}`,
    movimientoPlanillaId: id * 10,
    periodoPlanillaId: 1,
    montoSistema,
    montoAirhsp,
    diferencia: montoSistema - montoAirhsp,
    estado,
    justificacion: null,
    usuarioRevisa: null,
    fechaRevision: null,
  });

  /** Arranca el componente con período + personas + conciliaciones cargados. */
  function conDatos(
    filas: ConciliacionAirhspRow[] = [
      conc(1, 1, 'CONCILIADO', 3000, 3000),
      conc(2, 2, 'PENDIENTE', 3000, 2500),
      conc(3, 3, 'JUSTIFICADO', 3000, 2800),
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
      .expectOne('/api/rrhh/conciliacion-airhsp/periodo/1')
      .flush({ data: filas });
    return fixture;
  }

  it('al cargar selecciona el periodo ABIERTO y pide las conciliaciones del periodo', () => {
    const comp = conDatos().componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.conciliaciones().length).toBe(3);
  });

  it('semaforoDe() mapea estado y diferencia a verde / rojo / amarillo', () => {
    const comp = conDatos().componentInstance;
    const [c1, c2, c3] = comp.conciliaciones();
    expect(comp.semaforoDe(c1)).toBe('verde'); // CONCILIADO, dif 0
    expect(comp.semaforoDe(c2)).toBe('rojo'); // PENDIENTE, dif 500
    expect(comp.semaforoDe(c3)).toBe('amarillo'); // JUSTIFICADO
  });

  it('resumen() cuenta el semáforo y bloqueaPlanilla detecta los ROJO', () => {
    const comp = conDatos().componentInstance;
    const r = comp.resumen();
    expect(r.verde).toBe(1);
    expect(r.amarillo).toBe(1);
    expect(r.rojo).toBe(1);
    expect(comp.bloqueaPlanilla()).toBe(true);
  });

  it('el filtro "solo con discrepancia" reduce las filas', () => {
    const comp = conDatos().componentInstance;
    expect(comp.rowsFiltradas().length).toBe(3);
    comp.onFiltroDiscrepancia(true);
    // conc 1 tiene diferencia 0 → se excluye; quedan 2 y 3
    expect(comp.rowsFiltradas().length).toBe(2);
  });

  it('revisar() aplica la revisión del diálogo con un PUT y recarga', () => {
    const comp = conDatos().componentInstance;
    dialogResult = { estado: 'JUSTIFICADO', justificacion: 'Reintegro pendiente en AIRHSP' };

    comp.revisar(comp.conciliaciones()[1]); // conciliación id 2

    const req = httpMock.expectOne('/api/rrhh/conciliacion-airhsp/2/revisar');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.estado).toBe('JUSTIFICADO');
    expect(req.request.body.justificacion).toBe('Reintegro pendiente en AIRHSP');
    req.flush({ data: null });

    httpMock.expectOne('/api/rrhh/conciliacion-airhsp/periodo/1').flush({ data: [] });
  });

  it('si el diálogo se cancela no se hace ninguna petición', () => {
    const comp = conDatos().componentInstance;
    dialogResult = undefined; // diálogo cancelado

    comp.revisar(comp.conciliaciones()[1]);
    httpMock.expectNone('/api/rrhh/conciliacion-airhsp/2/revisar');
  });
});
