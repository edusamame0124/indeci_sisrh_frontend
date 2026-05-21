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
import { EmpleadoPuestoFormPageComponent } from './empleado-puesto-form-page.component';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

describe('EmpleadoPuestoFormPageComponent (Spec 009 / T135 — catálogos puesto)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(personaId: string = '7') {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          data: { mode: 'create' },
          paramMap: { get: (k: string) => (k === 'personaId' ? personaId : null) },
        },
      },
    };
  }

  function buildFixture(personaId: string = '7') {
    TestBed.configureTestingModule({
      imports: [EmpleadoPuestoFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(personaId),
        {
          provide: EmpleadoFlowBackendSyncService,
          useValue: { syncCompletedStepsFromBackend: () => of(undefined) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(EmpleadoPuestoFormPageComponent);
  }

  function flushParaleloHistorialYCatalogos(opts?: {
    empleadoId?: number;
    historial?: unknown[];
    niveles?: unknown[];
    sedes?: unknown[];
    dependencias?: unknown[];
    estructuras?: unknown[];
  }): void {
    const eid = opts?.empleadoId ?? 42;
    // forkJoin dispara GET en paralelo: expectOne por URL exacta (un predicado
    // "está en el mapa de URLs" coincide con las 5 a la vez y rompe HttpTestingBackend).
    httpMock.expectOne(`/api/rrhh/puesto/${eid}`).flush({ data: opts?.historial ?? [] });
    httpMock.expectOne('/api/catalogos/niveles').flush({ data: opts?.niveles ?? [] });
    httpMock.expectOne('/api/catalogos/sedes').flush({ data: opts?.sedes ?? [] });
    httpMock.expectOne('/api/catalogos/dependencias').flush({ data: opts?.dependencias ?? [] });
    httpMock.expectOne('/api/catalogos/estructuras-organicas').flush({
      data: opts?.estructuras ?? [],
    });
  }

  function flushBoot(opts?: {
    empleadoId?: number;
    historial?: unknown[];
    niveles?: unknown[];
    sedes?: unknown[];
    dependencias?: unknown[];
    estructuras?: unknown[];
  }): void {
    httpMock.expectOne('/api/rrhh/persona/7').flush({
      data: {
        id: 7,
        empleadoId: opts?.empleadoId ?? 42,
        nombreCompleto: 'Ana Pérez',
        dni: '11223344',
        email: 'ana@indeci.gob.pe',
      },
    });
    flushParaleloHistorialYCatalogos(opts);
  }

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('declara los 6 controles del form (cargo + 5 catálogos)', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const names = Object.keys(comp.form.controls).sort();
    expect(names).toEqual(
      ['cargo', 'nivelId', 'sedeId', 'oficinaId', 'dependenciaId', 'estructuraOrganicaId'].sort(),
    );
    expect(comp.form.controls.nivelId.value).toBeNull();
    expect(comp.form.controls.dependenciaId.value).toBeNull();
    expect(comp.form.controls.estructuraOrganicaId.value).toBeNull();

    flushBoot();
  });

  it('carga historial de puesto + 4 catálogos en paralelo tras persona (switchMap + forkJoin)', () => {
    const fixture = buildFixture();
    fixture.detectChanges();

    flushBoot({
      niveles: [{ id: 1, codigo: 'P1', nombre: 'P1 - Profesional' }],
      sedes: [{ id: 10, nombre: 'Sede Lima', direccion: null, telefono: null, activo: 1 }],
      dependencias: [{ id: 20, nombre: 'Dirección General', sigla: 'DG' }],
      estructuras: [{ id: 30, codigo: 'EO01', nombre: 'Alta Dirección' }],
    });

    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.niveles().length).toBe(1);
    expect(comp.sedes().length).toBe(1);
    expect(comp.dependencias().length).toBe(1);
    expect(comp.estructuras().length).toBe(1);
    expect(comp.empleadoId()).toBe(42);
    expect(comp.pageLoading()).toBe(false);
    expect(comp.primerRegistroDePuesto()).toBe(true);

    const card = (fixture.nativeElement as HTMLElement).querySelector('mat-card-title');
    expect((card?.textContent ?? '').trim()).toContain('Registrar nuevo puesto');
  });

  it('muestra copy de cambio de puesto cuando ya existe historial', () => {
    const fixture = buildFixture();
    fixture.detectChanges();

    flushBoot({
      historial: [{ id: 1, cargo: 'X', activo: 1 }],
    });

    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.primerRegistroDePuesto()).toBe(false);
    const card = (fixture.nativeElement as HTMLElement).querySelector('mat-card-title');
    expect((card?.textContent ?? '').trim()).toContain('Registrar cambio de puesto');
  });

  it('cascade Sede → Oficina: al cambiar sede pide oficinas/sede/{id} y limpia la elegida (EC-09-10)', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushBoot();

    const comp = fixture.componentInstance;
    comp.form.controls.oficinaId.setValue(999, { emitEvent: false });
    comp.form.controls.sedeId.setValue(10);

    expect(comp.form.controls.oficinaId.value).toBeNull();
    expect(comp.oficinasLoading()).toBe(true);

    const req = httpMock.expectOne('/api/catalogos/oficinas/sede/10');
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        { id: 100, sedeId: 10, nombre: 'Oficina Central', sigla: 'OC', activo: 1 },
      ],
    });

    expect(comp.oficinas().length).toBe(1);
    expect(comp.oficinasLoading()).toBe(false);
  });

  it('al volver sede a null, vacía oficinas sin disparar HTTP', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushBoot();

    const comp = fixture.componentInstance;
    comp.form.controls.sedeId.setValue(10);
    httpMock.expectOne('/api/catalogos/oficinas/sede/10').flush({ data: [] });

    comp.form.controls.sedeId.setValue(null);
    expect(comp.oficinas().length).toBe(0);
    httpMock.expectNone('/api/catalogos/oficinas/sede/null');
  });

  it('submit incluye dependenciaId y estructuraOrganicaId cuando hay selección', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushBoot();

    const comp = fixture.componentInstance;
    comp.form.patchValue({
      cargo: 'analista',
      nivelId: 1,
      dependenciaId: 20,
      estructuraOrganicaId: 30,
    });
    comp.submit();

    const req = httpMock.expectOne('/api/rrhh/puesto');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as Record<string, unknown>;
    expect(body['cargo']).toBe('ANALISTA');
    expect(body['empleadoId']).toBe(42);
    expect(body['nivelId']).toBe(1);
    expect(body['dependenciaId']).toBe(20);
    expect(body['estructuraOrganicaId']).toBe(30);
    expect(body['sedeId']).toBeUndefined();
    expect(body['oficinaId']).toBeUndefined();
    req.flush({ data: null });
  });

  it('submit omite IDs sin selección (no envía null al backend)', () => {
    const fixture = buildFixture();
    fixture.detectChanges();
    flushBoot();

    const comp = fixture.componentInstance;
    comp.form.patchValue({ cargo: 'coordinador' });
    comp.submit();

    const req = httpMock.expectOne('/api/rrhh/puesto');
    const body = req.request.body as Record<string, unknown>;
    expect(body['cargo']).toBe('COORDINADOR');
    expect(body['empleadoId']).toBe(42);
    expect(body['nivelId']).toBeUndefined();
    expect(body['sedeId']).toBeUndefined();
    expect(body['oficinaId']).toBeUndefined();
    expect(body['dependenciaId']).toBeUndefined();
    expect(body['estructuraOrganicaId']).toBeUndefined();
    req.flush({ data: null });
  });
}, 30_000);
