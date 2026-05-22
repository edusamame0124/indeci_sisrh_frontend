import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CierrePeriodoPageComponent } from './cierre-periodo-page.component';
import type { PeriodoPlanillaRow, PeriodoEstado } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';
import type { ConciliacionAirhspRow } from '../../models/conciliacion-airhsp.model';

describe('CierrePeriodoPageComponent (Spec 011 / B7 — ciclo de aprobación)', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let dialogConfirm: boolean;

  const fakeDialog = {
    open: () => ({ afterClosed: () => of(dialogConfirm) }),
  };

  function provideStubRoute(id: string = '1') {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: { paramMap: { get: (k: string) => (k === 'id' ? id : null) } },
      },
    };
  }

  function build(id: string = '1') {
    dialogConfirm = true;
    TestBed.configureTestingModule({
      imports: [CierrePeriodoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(id),
      ],
    });
    TestBed.overrideComponent(CierrePeriodoPageComponent, {
      add: { providers: [{ provide: MatDialog, useValue: fakeDialog }] },
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(CierrePeriodoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  const periodo = (estado: PeriodoEstado): PeriodoPlanillaRow => ({
    id: 1,
    periodo: '2026-05',
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-31',
    estado,
    observacion: '',
    fechaCierre: null,
    nroCertPresup: null,
    fechaAprobacion: null,
    activo: 1,
  });

  const mov = (estado: string, estadoNeto: string | null): MovimientoPlanillaRow => ({
    id: 10,
    empleadoId: 42,
    periodo: '2026-05',
    totalIngresos: 1000,
    totalDescuentos: 100,
    netoPagar: 900,
    estado,
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto,
  });

  const concil = (estado: string): ConciliacionAirhspRow => ({
    id: 5,
    empleadoId: 42,
    registroAirhsp: '000139',
    movimientoPlanillaId: 100,
    periodoPlanillaId: 1,
    montoSistema: 1000,
    montoAirhsp: 1000,
    diferencia: 0,
    estado,
    justificacion: null,
    usuarioRevisa: null,
    fechaRevision: null,
  });

  function flushBoot(
    p: PeriodoPlanillaRow,
    movimientos: MovimientoPlanillaRow[] = [],
    conciliaciones: ConciliacionAirhspRow[] = [],
  ) {
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [p] });
    httpMock
      .expectOne(`/api/rrhh/movimiento-planilla/periodo/${p.periodo}`)
      .flush({ data: movimientos });
    httpMock
      .expectOne(`/api/rrhh/conciliacion-airhsp/periodo/${p.id}`)
      .flush({ data: conciliaciones });
  }

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('carga periodo, movimientos y conciliaciones del período', () => {
    const fixture = build('1');
    flushBoot(periodo('ABIERTO'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
    const comp = fixture.componentInstance;
    expect(comp.periodo()?.id).toBe(1);
    expect(comp.movimientos().length).toBe(1);
    expect(comp.conciliaciones().length).toBe(1);
    expect(comp.loading()).toBe(false);
  });

  it('gates: detecta conciliación ROJA y movimiento NETO_NO_VA', () => {
    const fixture = build('1');
    flushBoot(
      periodo('EN_REVISION'),
      [mov('PROCESADO', 'NETO_NO_VA')],
      [concil('PENDIENTE')],
    );
    const comp = fixture.componentInstance;
    expect(comp.conciliacionesRojas()).toBe(1);
    expect(comp.netoNoVa()).toBe(1);
    expect(comp.gates().conciliacion).toBe(false);
    expect(comp.gates().neto).toBe(false);
  });

  it('canAprobar es true en EN_REVISION con gates OK y cert cargada', () => {
    const fixture = build('1');
    flushBoot(periodo('EN_REVISION'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
    const comp = fixture.componentInstance;
    expect(comp.canAprobar()).toBe(false); // aún sin cert
    comp.nroCertPresup.set('CERT-2026-001');
    expect(comp.gates().todosOk).toBe(true);
    expect(comp.canAprobar()).toBe(true);
  });

  it('canAprobar es false si falta la certificación presupuestal', () => {
    const fixture = build('1');
    flushBoot(periodo('EN_REVISION'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
    const comp = fixture.componentInstance;
    comp.nroCertPresup.set('   ');
    expect(comp.gates().cert).toBe(false);
    expect(comp.canAprobar()).toBe(false);
  });

  it('enviarRevision() hace PUT a /enviar-revision y recarga', () => {
    const fixture = build('1');
    flushBoot(periodo('ABIERTO'));
    fixture.componentInstance.enviarRevision();

    const req = httpMock.expectOne('/api/rrhh/periodo-planilla/enviar-revision/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: null });

    flushBoot(periodo('EN_REVISION')); // recarga
  });

  it('aprobar() hace PUT a /aprobar con el número de certificación', () => {
    const fixture = build('1');
    flushBoot(periodo('EN_REVISION'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
    const comp = fixture.componentInstance;
    comp.nroCertPresup.set('CERT-2026-001');

    comp.aprobar();

    const req = httpMock.expectOne('/api/rrhh/periodo-planilla/aprobar/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.nroCertPresup).toBe('CERT-2026-001');
    req.flush({ data: null });

    flushBoot(periodo('APROBADO'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
  });

  it('cerrar() hace PUT a /cerrar desde APROBADO', () => {
    const fixture = build('1');
    flushBoot(periodo('APROBADO'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
    fixture.componentInstance.cerrar();

    const req = httpMock.expectOne('/api/rrhh/periodo-planilla/cerrar/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ data: null });

    flushBoot(periodo('CERRADO'), [mov('PROCESADO', 'BIEN')], [concil('CONCILIADO')]);
  });

  it('redirige a /planilla/periodos si el id no existe en el listado', () => {
    build('99');
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodo('ABIERTO')] });
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/periodos']);
  });

  it('redirige a /planilla/periodos si el id de URL es inválido', () => {
    build('xyz');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/periodos']);
  });
});
