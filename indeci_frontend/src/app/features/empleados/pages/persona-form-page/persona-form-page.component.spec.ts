import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PersonaFormPageComponent } from './persona-form-page.component';

describe('PersonaFormPageComponent (Spec 009 / T134 — dropdowns demográficos)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(mode: 'create' | 'edit' = 'create', id: string | null = null) {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          data: { mode },
          paramMap: { get: (k: string) => (k === 'id' ? id : null) },
        },
      },
    };
  }

  function buildFixture(mode: 'create' | 'edit' = 'create', id: string | null = null) {
    TestBed.configureTestingModule({
      imports: [PersonaFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(mode, id),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(PersonaFormPageComponent);
  }

  function flushCatalogs(opts?: {
    ubigeo?: unknown[];
    sexos?: unknown[];
    estadosCiviles?: unknown[];
    tiposDocumento?: unknown[];
    profesiones?: unknown[];
    gradosAcademicos?: unknown[];
  }): void {
    httpMock
      .expectOne('/api/catalogos/ubigeo')
      .flush({ data: opts?.ubigeo ?? [] });
    httpMock
      .expectOne('/api/catalogos/sexos')
      .flush({ data: opts?.sexos ?? [] });
    httpMock
      .expectOne('/api/catalogos/estados-civiles')
      .flush({ data: opts?.estadosCiviles ?? [] });
    httpMock
      .expectOne('/api/catalogos/tipos-documento')
      .flush({ data: opts?.tiposDocumento ?? [] });
    httpMock
      .expectOne('/api/catalogos/profesiones')
      .flush({ data: opts?.profesiones ?? [] });
    httpMock
      .expectOne('/api/catalogos/grados-academicos')
      .flush({ data: opts?.gradosAcademicos ?? [] });
  }

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('declara los 5 dropdowns nuevos como controles opcionales (default null)', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const names = Object.keys(comp.form.controls).sort();
    expect(names).toContain('sexoId');
    expect(names).toContain('estadoCivilId');
    expect(names).toContain('tipoDocumentoId');
    expect(names).toContain('profesionId');
    expect(names).toContain('gradoAcademicoId');

    expect(comp.form.controls.sexoId.value).toBeNull();
    expect(comp.form.controls.estadoCivilId.value).toBeNull();
    expect(comp.form.controls.tipoDocumentoId.value).toBeNull();
    expect(comp.form.controls.profesionId.value).toBeNull();
    expect(comp.form.controls.gradoAcademicoId.value).toBeNull();

    expect(comp.form.controls.sexoId.hasError('required')).toBe(false);
    expect(comp.form.controls.estadoCivilId.hasError('required')).toBe(false);

    flushCatalogs();
  });

  it('carga los 6 catálogos en paralelo al iniciar', () => {
    const fixture = buildFixture();
    fixture.detectChanges();

    flushCatalogs({
      sexos: [{ id: 1, codigo: 'M', nombre: 'Masculino' }],
      estadosCiviles: [{ id: 5, codigo: 'S', nombre: 'Soltero(a)' }],
      tiposDocumento: [{ id: 9, codigo: 'DNI', nombre: 'DNI' }],
      profesiones: [{ id: 3, nombre: 'Ingeniería de Sistemas', activo: 1 }],
      gradosAcademicos: [{ id: 4, nombre: 'Bachiller', activo: 1 }],
    });

    const comp = fixture.componentInstance;
    expect(comp.sexos().length).toBe(1);
    expect(comp.estadosCiviles().length).toBe(1);
    expect(comp.tiposDocumento().length).toBe(1);
    expect(comp.profesiones().length).toBe(1);
    expect(comp.gradosAcademicos().length).toBe(1);
    expect(comp.pageLoading()).toBe(false);
  });

  it('al guardar en modo create envía los 5 IDs (o null) en el payload', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushCatalogs();

    const comp = fixture.componentInstance;
    comp.form.patchValue({
      nombreCompleto: 'Ana Pérez',
      dni: '12345678',
      email: 'ana@indeci.gob.pe',
      distritoId: '150101',
      sexoId: 1,
      estadoCivilId: 5,
      tipoDocumentoId: 9,
      profesionId: 3,
      gradoAcademicoId: 4,
    });
    comp.onSubmit();

    const req = httpMock.expectOne('/api/rrhh/persona');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as Record<string, unknown>;
    expect(body['sexoId']).toBe(1);
    expect(body['estadoCivilId']).toBe(5);
    expect(body['tipoDocumentoId']).toBe(9);
    expect(body['profesionId']).toBe(3);
    expect(body['gradoAcademicoId']).toBe(4);
    expect(body['email']).toBe('ana@indeci.gob.pe');

    req.flush({ data: null });
  });

  it('al guardar sin selección, envía null en los 5 IDs (campos opcionales)', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushCatalogs();

    const comp = fixture.componentInstance;
    comp.form.patchValue({
      nombreCompleto: 'Bruno Silva',
      dni: '87654321',
      email: 'bruno@indeci.gob.pe',
      distritoId: '150102',
    });
    comp.onSubmit();

    const req = httpMock.expectOne('/api/rrhh/persona');
    const body = req.request.body as Record<string, unknown>;
    expect(body['sexoId']).toBeNull();
    expect(body['estadoCivilId']).toBeNull();
    expect(body['tipoDocumentoId']).toBeNull();
    expect(body['profesionId']).toBeNull();
    expect(body['gradoAcademicoId']).toBeNull();

    req.flush({ data: null });
  });

  it('muestra mensaje de negocio cuando el DNI ya existe (400)', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushCatalogs();

    const comp = fixture.componentInstance;
    comp.form.patchValue({
      nombreCompleto: 'Duplicado Test',
      dni: '12345678',
      email: 'dup@indeci.gob.pe',
      distritoId: '150101',
    });
    comp.onSubmit();

    const req = httpMock.expectOne('/api/rrhh/persona');
    req.flush(
      { status: 400, mensaje: 'El DNI ya está registrado' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.persona-form__alert')?.textContent).toContain('DNI');
    expect(comp.saveError()).toContain('DNI');
    expect(comp.dniServerError()).toContain('DNI');
  });

  it('en modo edit, patchea los IDs leídos del response del backend', () => {
    const fixture = buildFixture('edit', '7');
    fixture.detectChanges();
    flushCatalogs();

    const getReq = httpMock.expectOne('/api/rrhh/persona/7');
    getReq.flush({
      data: {
        id: 7,
        nombreCompleto: 'Carla Ramos',
        dni: '11223344',
        email: 'carla@indeci.gob.pe',
        distritoId: '150101',
        estado: 'ACTIVO',
        sexoId: 2,
        estadoCivilId: 1,
        tipoDocumentoId: 9,
        profesionId: 3,
        gradoAcademicoId: 4,
      },
    });

    const comp = fixture.componentInstance;
    expect(comp.form.controls.sexoId.value).toBe(2);
    expect(comp.form.controls.estadoCivilId.value).toBe(1);
    expect(comp.form.controls.tipoDocumentoId.value).toBe(9);
    expect(comp.form.controls.profesionId.value).toBe(3);
    expect(comp.form.controls.gradoAcademicoId.value).toBe(4);
  });
});
