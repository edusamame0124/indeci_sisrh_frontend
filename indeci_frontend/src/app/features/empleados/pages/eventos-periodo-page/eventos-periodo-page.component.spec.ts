import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { EventosPeriodoPageComponent } from './eventos-periodo-page.component';
import type { PersonaResumen } from '../../models/persona-empleado.model';
import type {
  EventoPeriodoResponse,
  TipoEvento,
} from '../../models/evento-periodo.model';

describe('EventosPeriodoPageComponent (F3.6)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function build() {
    TestBed.configureTestingModule({
      imports: [EventosPeriodoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(EventosPeriodoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushInicial(eventos: EventoPeriodoResponse[] = [], total = eventos.length) {
    httpMock.expectOne('/api/rrhh/evento-periodo/tipos').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/legajo/categorias').flush({ data: [] });
    httpMock
      .expectOne((r) => r.url.startsWith('/api/rrhh/evento-periodo') && r.url.includes('page=0'))
      .flush({
        data: {
          content: eventos,
          totalElements: total,
          totalPages: 1,
          pageNumber: 0,
          pageSize: 20,
        },
      });
  }

  function evento(id: number, empleadoId: number): EventoPeriodoResponse {
    return {
      id,
      empleadoId,
      empleadoNombre: 'Juan Pérez',
      empleadoDni: '12345678',
      tipoEventoId: 1,
      tipoEventoCodigo: 'MATERNIDAD',
      tipoEventoNombre: 'Subsidio por Maternidad',
      generaSubsidio: 'S',
      requiereAdjunto: 'S',
      periodo: '202605',
      fechaInicio: '2026-05-01',
      fechaFin: '2026-05-30',
      diasAfectos: 30,
      sustentoLegajoDocId: 99,
      observacion: null,
      estado: 'REGISTRADO',
      createdAt: '2026-05-15T10:00:00',
      createdBy: 'rrhh',
    };
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('al iniciar carga bandeja paginada', () => {
    const fixture = build();
    flushInicial([evento(100, 42), evento(101, 1516)], 2);
    expect(fixture.componentInstance.eventos()).toHaveLength(2);
    expect(fixture.componentInstance.totalElements()).toBe(2);
  });

  it('filtro empleado dispara nueva consulta con empleadoId', () => {
    const fixture = build();
    flushInicial([evento(100, 42), evento(101, 1516)], 2);

    const persona: PersonaResumen = {
      id: 7,
      empleadoId: 42,
      nombreCompleto: 'Juan',
      dni: '12345678',
    };
    fixture.componentInstance.onEmpleadoFiltroSeleccionado(persona);

    const req = httpMock.expectOne((r) =>
      r.url.includes('empleadoId=42') && r.url.includes('page=0'),
    );
    req.flush({
      data: {
        content: [evento(100, 42)],
        totalElements: 1,
        totalPages: 1,
        pageNumber: 0,
        pageSize: 20,
      },
    });
    expect(fixture.componentInstance.eventos()).toHaveLength(1);
  });
});
