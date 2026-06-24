import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService } from '../../../../core/services/auth.service';
import { ConceptoPlanillaPageComponent } from './concepto-planilla-page.component';

describe('ConceptoPlanillaPageComponent (SPEC_CONCEPTOS_PLANILLA — dominio Planilla)', () => {
  let httpMock: HttpTestingController;

  function configure(roles: readonly string[]): void {
    TestBed.configureTestingModule({
      imports: [ConceptoPlanillaPageComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'roles').mockReturnValue([...roles]);
    httpMock = TestBed.inject(HttpTestingController);
  }

  /** SPEC §15: la pantalla también carga el catálogo de tipos de planilla. */
  function flushPlanillaTipos(): void {
    httpMock
      .expectOne('/api/rrhh/planilla-tipo')
      .flush({ estado: 'OK', mensaje: 'ok', data: [{ codigo: 'CAS', nombre: 'CAS', orden: 1, activo: 1 }] });
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('lista conceptos vía GET /api/rrhh/concepto-planilla', () => {
    configure(['ADMIN']);
    const fixture = TestBed.createComponent(ConceptoPlanillaPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [
        {
          id: 1,
          codigo: 'I-001',
          nombre: 'HABER',
          tipo: 'INGRESO',
          naturaleza: 'REM',
          activo: 1,
          planillaTipos: ['CAS'],
        },
      ],
    });
    flushPlanillaTipos();
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    // SPEC §15: la lista resuelve código → nombre de la planilla asociada.
    expect([...fixture.componentInstance.planillaNombres(fixture.componentInstance.rows()[0])]).toEqual([
      'CAS',
    ]);
  });

  it('rol sin permiso Planilla (EMPLEADO) no tiene columnas de acciones', () => {
    configure(['EMPLEADO']);
    const fixture = TestBed.createComponent(ConceptoPlanillaPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/concepto-planilla').flush({ estado: 'OK', mensaje: 'ok', data: [] });
    flushPlanillaTipos();
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.canWrite()).toBe(false);
    expect(comp.canApprove()).toBe(false);
    expect(comp.displayCols()).not.toContain('acciones');
  });

  it('PLANILLA_ANALISTA tiene PLA_WRITE pero no PLA_APPROVE', () => {
    configure(['PLANILLA_ANALISTA']);
    const fixture = TestBed.createComponent(ConceptoPlanillaPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/concepto-planilla').flush({ estado: 'OK', mensaje: 'ok', data: [] });
    flushPlanillaTipos();
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.canWrite()).toBe(true);
    expect(comp.canApprove()).toBe(false);
    expect(comp.displayCols()).toContain('acciones');
  });

  it('PLANILLA_APROBADOR puede activar un concepto EN_REVISION', () => {
    configure(['PLANILLA_APROBADOR']);
    const fixture = TestBed.createComponent(ConceptoPlanillaPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/concepto-planilla').flush({ estado: 'OK', mensaje: 'ok', data: [] });
    flushPlanillaTipos();
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.canApprove()).toBe(true);
    expect(comp.canActivar({ id: 1, estado: 'EN_REVISION' } as never)).toBe(true);
  });
});
