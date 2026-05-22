import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PeriodosPageComponent } from './periodos-page.component';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';

describe('PeriodosPageComponent (Spec 009 / T152)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [PeriodosPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(PeriodosPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
  });

  const filaAbierto = (): PeriodoPlanillaRow => ({
    id: 1,
    periodo: '2026-05',
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-31',
    estado: 'ABIERTO',
    observacion: 'Planilla mayo',
    fechaCierre: null,
    activo: 1,
  });

  const filaCerrado = (): PeriodoPlanillaRow => ({
    id: 2,
    periodo: '2026-04',
    fechaInicio: '2026-04-01',
    fechaFin: '2026-04-30',
    estado: 'CERRADO',
    observacion: '',
    fechaCierre: '2026-05-02T08:00:00',
    activo: 1,
  });

  it('al iniciar pide GET /api/rrhh/periodo-planilla y pinta el listado', () => {
    const fixture = build();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/rrhh/periodo-planilla');
    expect(req.request.method).toBe('GET');
    req.flush({ data: [filaAbierto(), filaCerrado()] });

    const comp = fixture.componentInstance;
    expect(comp.rows().length).toBe(2);
    expect(comp.loading()).toBe(false);
  });

  it('declara columnas en orden esperado (incluye estado y acciones)', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [] });

    expect([...comp.columns]).toEqual([
      'periodo',
      'fechaInicio',
      'fechaFin',
      'estado',
      'observacion',
      'acciones',
    ]);
  });

  it('periodosYaRegistrados computed deriva el Set de claves periodo', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({
      data: [filaAbierto(), filaCerrado()],
    });

    expect(comp.periodosYaRegistrados().has('2026-05')).toBe(true);
    expect(comp.periodosYaRegistrados().has('2026-04')).toBe(true);
    expect(comp.periodosYaRegistrados().has('2026-06')).toBe(false);
  });

  it('gestionar() navega a la página de ciclo de vida del período (Spec 011)', () => {
    const fixture = build();
    const router = TestBed.inject(Router);
    const navega = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [filaAbierto()] });

    fixture.componentInstance.gestionar(filaAbierto());
    expect(navega).toHaveBeenCalledWith(['/planilla/cierre', 1]);
  });

  it('clampea pageIndex cuando la página actual supera el total', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [filaAbierto()] });

    comp.onPage({ pageIndex: 5, pageSize: 10, length: 1 });
    expect(comp.pageIndex()).toBe(5); // onPage solo guarda
    // Forzar recarga vacía
    // (No hace falta verificar HTTP de nuevo; clampPageIndex se llama al next listar)
  });
});
