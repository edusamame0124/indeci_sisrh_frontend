import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ResumenMetaPageComponent } from './resumen-meta-page.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { ResumenMetaRow } from '../../../planilla/models/resumen-meta.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';

describe('ResumenMetaPageComponent (Spec 010 PANTALLA-05 — Resumen por meta)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [ResumenMetaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ResumenMetaPageComponent);
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

  const metaRow = (
    meta: string,
    pea: number,
    ingresos: number,
    essalud: number,
    total: number,
  ): ResumenMetaRow => ({
    meta,
    centroCosto: `CC-${meta}`,
    pea,
    ingresos,
    essalud,
    aportes: 0,
    total,
    empleados: [
      { empleadoId: 1, ingresos, essalud, aportes: 0, total },
    ],
  });

  /** Arranca el componente con período + personas + resumen cargados. */
  function conDatos(
    metas: ResumenMetaRow[] = [
      metaRow('0001', 2, 7000, 630, 7630),
      metaRow('0002', 1, 2000, 0, 2000),
    ],
  ) {
    const fixture = build();
    httpMock
      .expectOne('/api/rrhh/periodo-planilla')
      .flush({ data: [periodo('2026-05', 'ABIERTO')] });
    httpMock
      .expectOne('/api/rrhh/persona')
      .flush({ data: [persona(1, 'Ana Lopez'), persona(2, 'Beto Diaz')] });
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/resumen-por-meta/2026-05')
      .flush({ data: metas });
    return fixture;
  }

  it('al cargar selecciona el periodo ABIERTO y trae el resumen por meta', () => {
    const comp = conDatos().componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.metas().length).toBe(2);
    expect(comp.metas()[0].meta).toBe('0001');
  });

  it('totalesGenerales() suma PEA y montos de todas las metas', () => {
    const t = conDatos().componentInstance.totalesGenerales();
    expect(t.pea).toBe(3);
    expect(t.ingresos).toBe(9000);
    expect(t.essalud).toBe(630);
    expect(t.total).toBe(9630);
  });

  it('toggle() expande y colapsa el detalle de una meta', () => {
    const comp = conDatos().componentInstance;
    expect(comp.metaExpandida()).toBeNull();
    comp.toggle('0001');
    expect(comp.metaExpandida()).toBe('0001');
    comp.toggle('0001');
    expect(comp.metaExpandida()).toBeNull();
  });

  it('nombreEmpleado() resuelve el nombre desde el catálogo de personas', () => {
    const comp = conDatos().componentInstance;
    expect(comp.nombreEmpleado(1)).toBe('Ana Lopez');
    expect(comp.nombreEmpleado(99)).toBe('Empleado #99');
  });

  it('cambiar de periodo recarga el resumen por meta', () => {
    const comp = conDatos().componentInstance;
    comp.onPeriodoChange('2026-04');
    httpMock
      .expectOne('/api/rrhh/movimiento-planilla/resumen-por-meta/2026-04')
      .flush({ data: [metaRow('0003', 1, 1000, 90, 1090)] });
    expect(comp.metas().length).toBe(1);
    expect(comp.metas()[0].meta).toBe('0003');
  });
});
