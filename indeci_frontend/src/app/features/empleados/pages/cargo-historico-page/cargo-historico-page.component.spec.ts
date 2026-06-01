import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CargoHistoricoPageComponent } from './cargo-historico-page.component';
import type { EmpleadoPuestoRow } from '../../models/empleado-puesto.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/**
 * F5.1e — Tests del Cargo histórico (timeline).
 */
describe('CargoHistoricoPageComponent (F5.1)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [CargoHistoricoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CargoHistoricoPageComponent);
    fixture.detectChanges();
    // Drenar la carga inicial de personas del PersonaPickerComponent.
    httpMock.expectOne('/api/rrhh/persona').flush({ status: 'OK', mensaje: '', data: [] });
    return fixture;
  }

  function persona(id: number, empleadoId: number | null, nombre: string, dni: string): PersonaEmpleado {
    return {
      id,
      empleadoId,
      nombreCompleto: nombre,
      dni,
      email: '',
    };
  }

  function puesto(
    id: number,
    cargo: string,
    activo: number,
    fechaInicio: string,
    fechaFin: string | null,
    extra: Partial<EmpleadoPuestoRow> = {},
  ): EmpleadoPuestoRow {
    return {
      id,
      cargo,
      nivelId: null,
      sedeId: null,
      oficinaId: null,
      jefeId: null,
      activo,
      fechaInicio,
      fechaFin,
      ...extra,
    };
  }

  afterEach(() => {
    httpMock.verify();
  });

  // =====================================================================
  // Test 1 — sin persona seleccionada NO dispara fetch de puestos
  // =====================================================================

  it('al inicio sin persona seleccionada no llama al endpoint de puesto', () => {
    const fixture = build();
    httpMock.expectNone((r) => r.url.startsWith('/api/rrhh/puesto/'));
    expect(fixture.componentInstance.persona()).toBeNull();
    expect(fixture.componentInstance.puestos()).toHaveLength(0);
  });

  // =====================================================================
  // Test 2 — al seleccionar persona dispara GET y popula timeline
  // =====================================================================

  it('al seleccionar persona dispara GET /api/rrhh/puesto/:id y popula puestos', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.onPersonaSeleccionada(persona(10, 42, 'Pérez Juan', '12345678'));
    const req = httpMock.expectOne('/api/rrhh/puesto/42');
    req.flush({
      status: 'OK',
      mensaje: '',
      data: [
        puesto(100, 'Analista RR.HH.', 1, '2025-01-15', null, { oficina: 'RR.HH.', jefe: 'María L.' }),
        puesto(99, 'Asistente RR.HH.', 0, '2023-03-01', '2025-01-14'),
      ],
    });
    expect(comp.puestos()).toHaveLength(2);
    expect(comp.puestoActual()?.id).toBe(100);
    expect(comp.historialAnterior()).toHaveLength(1);
  });

  // =====================================================================
  // Test 3 — helpers de presentación: duración y formato de fecha
  // =====================================================================

  it('duracion() devuelve label legible en español', () => {
    const fixture = build();
    const comp = fixture.componentInstance;

    // 7 meses
    expect(comp.duracion(puesto(1, 'X', 0, '2024-01-01', '2024-08-01'))).toBe('7 meses');
    // 1 mes (singular)
    expect(comp.duracion(puesto(2, 'X', 0, '2024-01-01', '2024-02-01'))).toBe('1 mes');
    // 1 año
    expect(comp.duracion(puesto(3, 'X', 0, '2024-01-01', '2025-01-01'))).toBe('1 año');
    // 2 años 3 meses
    expect(comp.duracion(puesto(4, 'X', 0, '2022-01-01', '2024-04-01'))).toBe('2 años 3 meses');
    // Sin fechaInicio
    expect(comp.duracion(puesto(5, 'X', 0, '', null))).toBe('');

    expect(comp.fmtFecha('2025-01-15')).toBe('15/01/2025');
    expect(comp.fmtFecha(null)).toBe('—');
  });
});
