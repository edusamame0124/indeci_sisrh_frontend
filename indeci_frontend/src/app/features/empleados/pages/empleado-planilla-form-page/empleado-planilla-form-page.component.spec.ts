import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { EmpleadoPlanillaFormPageComponent } from './empleado-planilla-form-page.component';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

describe('EmpleadoPlanillaFormPageComponent (config remunerativa DS)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(opts: {
    mode: 'create' | 'edit';
    personaId?: string;
    planillaId?: string;
  }) {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          data: { mode: opts.mode },
          paramMap: {
            get: (k: string) =>
              k === 'personaId'
                ? opts.personaId ?? '7'
                : k === 'planillaId'
                  ? (opts.planillaId ?? null)
                  : null,
          },
        },
      },
    };
  }

  function buildFixture(opts: {
    mode: 'create' | 'edit';
    personaId?: string;
    planillaId?: string;
  }) {
    TestBed.configureTestingModule({
      imports: [EmpleadoPlanillaFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(opts),
        {
          provide: EmpleadoFlowBackendSyncService,
          useValue: { syncCompletedStepsFromBackend: () => of(undefined) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(EmpleadoPlanillaFormPageComponent);
  }

  function flushCatalogos(): void {
    httpMock.expectOne('/api/catalogos/regimenes-laborales').flush({
      data: [{ id: 1, codigo: '1057', nombre: 'CAS', activo: 1 }],
    });
    httpMock.expectOne('/api/catalogos/tipos-contrato').flush({ data: [] });
    httpMock.expectOne('/api/catalogos/condiciones-laborales').flush({
      data: [{ id: 2, codigo: 'CAS', nombre: 'CAS', activo: 1 }],
    });
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('en modo edit, patchea campos incluyendo AIRHSP y monto contratado', () => {
    const fixture = buildFixture({ mode: 'edit', personaId: '7', planillaId: '11' });
    fixture.detectChanges();
    flushCatalogos();

    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: 42,
        nombreCompleto: 'Ana Pérez',
        dni: '11223344',
        email: 'ana@indeci.gob.pe',
      },
    });

    httpMock.expectOne('/api/rrhh/planilla/42').flush({
      data: [
        {
          id: 11,
          sueldoBasico: 4864.19,
          codigoAirhsp: '000051',
          montoContrato: 4500,
          movilidad: null,
          alimentacion: null,
          tieneAsignacionFamiliar: 1,
          numHijos: 2,
          activo: 1,
          descuentoBanco: null,
          descuentoInstitucion: null,
          regimenLaboralId: 1,
          condicionLaboralId: 2,
        },
      ],
    });

    const incReq = httpMock.expectOne((r) => r.url.includes('/incrementos-ds'));
    incReq.flush({
      data: {
        aplica: true,
        montoContrato: 4500,
        incrementos: [],
        totalIncrementos: 364.19,
        remuneracionMensual: 4864.19,
      },
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.codigoAirhsp.value).toBe('000051');
    expect(comp.form.controls.montoContratado.value).toBe(4500);
    expect(comp.form.controls.sueldoBasico.value).toBe(4864.19);
    expect(comp.form.controls.numHijos.value).toBe(2);
    expect(comp.tieneHijos()).toBe(true);
  });

  it('expone controles sin movilidad ni alimentacion', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const keys = Object.keys(fixture.componentInstance.form.controls).sort();
    expect(keys).not.toContain('movilidad');
    expect(keys).not.toContain('alimentacion');
    expect(keys).toContain('codigoAirhsp');
    expect(keys).toContain('montoContratado');
    expect(keys).toContain('sueldoBasico');
  });

  it('onCodigoAirhspBlur rellena con ceros a la izquierda', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;
    comp.form.controls.codigoAirhsp.setValue('51');
    comp.onCodigoAirhspBlur();
    expect(comp.form.controls.codigoAirhsp.value).toBe('000051');
  });

  it('onMontoContratadoBlur dispara GET incrementos-ds y actualiza sueldoBasico', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;
    comp.form.controls.regimenLaboralId.setValue(1);
    comp.form.controls.montoContratado.setValue(4500);
    comp.onMontoContratadoBlur();

    const incReq = httpMock.expectOne((r) => r.url.includes('/incrementos-ds'));
    expect(incReq.request.params.get('montoContratado')).toBe('4500');
    incReq.flush({
      data: {
        aplica: true,
        montoContrato: 4500,
        incrementos: [],
        totalIncrementos: 364.19,
        remuneracionMensual: 4864.19,
      },
    });

    expect(comp.form.controls.sueldoBasico.value).toBe(4864.19);
    expect(comp.incrementosDs()?.totalIncrementos).toBe(364.19);
  });

  it('régimen sin incrementos DS muestra aplica=false en respuesta', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;
    comp.form.controls.regimenLaboralId.setValue(99);
    comp.form.controls.montoContratado.setValue(3000);
    comp.onMontoContratadoBlur();

    const incReq = httpMock.expectOne((r) => r.url.includes('/incrementos-ds'));
    incReq.flush({
      data: {
        aplica: false,
        montoContrato: 3000,
        incrementos: [],
        totalIncrementos: 0,
        remuneracionMensual: 3000,
      },
    });

    expect(comp.incrementosDs()?.aplica).toBe(false);
    expect(comp.form.controls.sueldoBasico.value).toBe(3000);
  });

  it('sueldoBasico está deshabilitado (readonly) y montoContratado es editable', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.sueldoBasico.disabled).toBe(true);
    expect(comp.form.controls.montoContratado.disabled).toBe(false);
  });

  it('onMontoContratadoInput trunca a 5 dígitos enteros y 2 decimales', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;
    let input = document.createElement('input');
    input.value = '6516516516516';
    comp.onMontoContratadoInput({ target: input } as unknown as Event);
    expect(comp.form.controls.montoContratado.value).toBe(65165);

    input = document.createElement('input');
    input.value = '12345678.456';
    comp.onMontoContratadoInput({ target: input } as unknown as Event);
    expect(comp.form.controls.montoContratado.value).toBe(12345.45);
  });

  it('submit incluye codigoAirhsp, montoContrato y sueldoBasico calculado', () => {
    const fixture = buildFixture({ mode: 'create', personaId: '7' });
    fixture.detectChanges();
    flushCatalogos();
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: { id: 7, empleadoId: 42, nombreCompleto: 'X', dni: '11223344', email: 'x@y.pe' },
    });

    const comp = fixture.componentInstance;
    comp.form.patchValue({
      regimenLaboralId: 1,
      codigoAirhsp: '000051',
      montoContratado: 4500,
      sueldoBasico: 4864.19,
      numHijos: 1,
    });

    comp.submit();

    const postReq = httpMock.expectOne('/api/rrhh/planilla');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toMatchObject({
      empleadoId: 42,
      codigoAirhsp: '000051',
      montoContrato: 4500,
      sueldoBasico: 4864.19,
      regimenLaboralId: 1,
    });
    expect(postReq.request.body.movilidad).toBeUndefined();
    expect(postReq.request.body.alimentacion).toBeUndefined();
    postReq.flush({ data: null });
  });
});
