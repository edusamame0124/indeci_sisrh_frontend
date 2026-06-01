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
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type {
  EventoPeriodoResponse,
  TipoEvento,
} from '../../models/evento-periodo.model';

/**
 * F3.6e — Tests del page de Eventos del Período.
 */
describe('EventosPeriodoPageComponent (F3.6)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function build(dialogMock?: { open: ReturnType<typeof vi.fn> }) {
    TestBed.configureTestingModule({
      imports: [EventosPeriodoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        ...(dialogMock ? [{ provide: MatDialog, useValue: dialogMock }] : []),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(EventosPeriodoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function tipoEvento(
    id: number,
    codigo: string,
    extra: Partial<TipoEvento> = {},
  ): TipoEvento {
    return {
      id,
      codigo,
      nombre: codigo,
      afectaDiasLaborados: 'S',
      afectaBaseAfp: 'S',
      afectaBaseEssalud: 'S',
      generaSubsidio: 'N',
      requiereAdjunto: 'N',
      permiteSolape: 'N',
      codigoPlameSunat: null,
      ordenVisual: id,
      activo: 1,
      ...extra,
    };
  }

  function persona(id: number, nombre: string, dni: string, empleadoId: number | null = id): PersonaEmpleado {
    return {
      id,
      empleadoId,
      nombreCompleto: nombre,
      dni,
      email: '',
    };
  }

  function evento(id: number, empleadoId: number, extra: Partial<EventoPeriodoResponse> = {}): EventoPeriodoResponse {
    return {
      id,
      empleadoId,
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
      ...extra,
    };
  }

  function flushCatalogosVacios() {
    httpMock.expectOne('/api/rrhh/evento-periodo/tipos').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/legajo/categorias').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
  }

  afterEach(() => {
    httpMock.verify();
  });

  // ===================== Carga inicial =====================

  it('al iniciar carga tipos + categorías + personas y popula signals', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/evento-periodo/tipos').flush({
      data: [tipoEvento(1, 'MATERNIDAD', { generaSubsidio: 'S', requiereAdjunto: 'S' })],
    });
    httpMock.expectOne('/api/rrhh/legajo/categorias').flush({
      data: [{ id: 4, nombre: 'Subsidios', ordenVisual: 40, activo: 1 }],
    });
    httpMock.expectOne('/api/rrhh/persona').flush({
      data: [
        persona(7, 'Juan Pérez', '12345678', 42),
        persona(8, 'Sin vínculo', '87654321', null),
      ],
    });
    const comp = fixture.componentInstance;
    expect(comp.tipos()).toHaveLength(1);
    expect(comp.categoriasLegajo()).toHaveLength(1);
    // Solo personas con empleadoId vinculado.
    expect(comp.personas()).toHaveLength(1);
    expect(comp.loadingCatalogos()).toBe(false);
  });

  // ===================== Selección empleado =====================

  it('al seleccionar empleado dispara GET de eventos', () => {
    const fixture = build();
    flushCatalogosVacios();

    fixture.componentInstance.onEmpleadoSeleccionado(persona(7, 'Juan', '12345678', 42));
    httpMock
      .expectOne('/api/rrhh/evento-periodo/empleado/42')
      .flush({ data: [evento(100, 42), evento(101, 42, { estado: 'VALIDADO' })] });

    expect(fixture.componentInstance.eventos()).toHaveLength(2);
    expect(fixture.componentInstance.empleadoSeleccionado()?.empleadoId).toBe(42);
  });

  // ===================== Filtros =====================

  it('filtroEstado limita la lista al estado escogido', () => {
    const fixture = build();
    flushCatalogosVacios();
    fixture.componentInstance.onEmpleadoSeleccionado(persona(7, 'Juan', '12345678', 42));
    httpMock.expectOne('/api/rrhh/evento-periodo/empleado/42').flush({
      data: [
        evento(100, 42, { estado: 'REGISTRADO' }),
        evento(101, 42, { estado: 'VALIDADO' }),
      ],
    });
    fixture.componentInstance.filtroEstado.setValue('VALIDADO');
    expect(fixture.componentInstance.eventosFiltrados()).toHaveLength(1);
    expect(fixture.componentInstance.eventosFiltrados()[0].estado).toBe('VALIDADO');
  });

  it('filtroTipo combina con filtroEstado', () => {
    const fixture = build();
    flushCatalogosVacios();
    fixture.componentInstance.onEmpleadoSeleccionado(persona(7, 'Juan', '12345678', 42));
    httpMock.expectOne('/api/rrhh/evento-periodo/empleado/42').flush({
      data: [
        evento(100, 42, { tipoEventoId: 1, estado: 'VALIDADO' }),
        evento(101, 42, { tipoEventoId: 2, estado: 'VALIDADO' }),
        evento(102, 42, { tipoEventoId: 2, estado: 'REGISTRADO' }),
      ],
    });
    fixture.componentInstance.filtroTipo.setValue(2);
    fixture.componentInstance.filtroEstado.setValue('VALIDADO');
    expect(fixture.componentInstance.eventosFiltrados()).toHaveLength(1);
    expect(fixture.componentInstance.eventosFiltrados()[0].id).toBe(101);
  });

  // ===================== Acciones =====================

  it('validar dispara PUT cambiar estado a VALIDADO y recarga lista', () => {
    const fixture = build();
    flushCatalogosVacios();
    fixture.componentInstance.onEmpleadoSeleccionado(persona(7, 'Juan', '12345678', 42));
    httpMock
      .expectOne('/api/rrhh/evento-periodo/empleado/42')
      .flush({ data: [evento(100, 42)] });

    fixture.componentInstance.validar(evento(100, 42));
    httpMock
      .expectOne('/api/rrhh/evento-periodo/100/estado/VALIDADO')
      .flush({ data: evento(100, 42, { estado: 'VALIDADO' }) });
    // Recarga
    httpMock
      .expectOne('/api/rrhh/evento-periodo/empleado/42')
      .flush({ data: [evento(100, 42, { estado: 'VALIDADO' })] });
  });

  it('eliminar abre confirm dialog con data correcta y al confirmar llama DELETE', () => {
    const fixture = build();
    flushCatalogosVacios();
    fixture.componentInstance.onEmpleadoSeleccionado(persona(7, 'Juan', '12345678', 42));
    httpMock
      .expectOne('/api/rrhh/evento-periodo/empleado/42')
      .flush({ data: [evento(100, 42)] });

    // Spy sobre la instancia inyectada en el componente (no la del TestBed,
    // que puede diferir cuando hay injectors anidados).
    const dialog = (fixture.componentInstance as unknown as { dialog: MatDialog })
      .dialog;
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as ReturnType<MatDialog['open']>);

    fixture.componentInstance.eliminar(evento(100, 42));

    expect(openSpy).toHaveBeenCalled();
    const data = (openSpy.mock.calls[0][1] as { data: { title: string; confirmText: string } })
      .data;
    expect(data.title).toBe('Eliminar evento');
    expect(data.confirmText).toBe('Eliminar');

    // Al confirmar, dispara DELETE + recarga.
    httpMock.expectOne('/api/rrhh/evento-periodo/100').flush({ data: null });
    httpMock
      .expectOne('/api/rrhh/evento-periodo/empleado/42')
      .flush({ data: [] });
  });

  it('eliminar al cancelar NO dispara DELETE', () => {
    const fixture = build();
    flushCatalogosVacios();
    fixture.componentInstance.onEmpleadoSeleccionado(persona(7, 'Juan', '12345678', 42));
    httpMock
      .expectOne('/api/rrhh/evento-periodo/empleado/42')
      .flush({ data: [evento(100, 42)] });

    const dialog = (fixture.componentInstance as unknown as { dialog: MatDialog })
      .dialog;
    vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(false),
    } as ReturnType<MatDialog['open']>);

    fixture.componentInstance.eliminar(evento(100, 42));
    // afterEach httpMock.verify() detectaría cualquier DELETE inesperado.
  });

  // ===================== Helpers visuales =====================

  it('displayEmpleado formato nombre + DNI', () => {
    const fixture = build();
    flushCatalogosVacios();
    const comp = fixture.componentInstance;
    expect(comp.displayEmpleado(persona(7, 'Juan Pérez', '12345678', 42))).toBe(
      'Juan Pérez — DNI 12345678',
    );
    expect(comp.displayEmpleado('')).toBe('');
    expect(comp.displayEmpleado(null)).toBe('');
  });

  it('estadoColor y estadoIcon mapean a la severidad correcta', () => {
    const fixture = build();
    flushCatalogosVacios();
    const comp = fixture.componentInstance;
    expect(comp.estadoColor('VALIDADO')).toBe('success');
    expect(comp.estadoColor('RECHAZADO')).toBe('danger');
    expect(comp.estadoColor('REGISTRADO')).toBe('warning');
    expect(comp.estadoIcon('VALIDADO')).toBe('check_circle');
    expect(comp.estadoIcon('RECHAZADO')).toBe('cancel');
    expect(comp.estadoIcon('REGISTRADO')).toBe('pending');
  });
});
