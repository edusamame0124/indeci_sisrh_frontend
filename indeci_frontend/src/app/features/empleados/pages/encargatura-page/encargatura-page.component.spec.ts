import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { EncargaturaPageComponent } from './encargatura-page.component';
import type { EncargaturaResponse } from '../../models/encargatura.model';

/**
 * F5.2e — Tests del listado de encargaturas.
 */
describe('EncargaturaPageComponent (F5.2)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [EncargaturaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EncargaturaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function row(id: number, extra: Partial<EncargaturaResponse> = {}): EncargaturaResponse {
    return {
      id,
      empleadoTitularId: 10,
      titularNombre: 'Pérez Juan',
      titularDni: '12345678',
      empleadoEncargId: 11,
      encargadoNombre: 'Soto María',
      encargadoDni: '87654321',
      fechaInicio: '2026-05-01',
      fechaFin: null,
      resolucion: 'R.A. 100-2026',
      estado: 'ACTIVO',
      ...extra,
    };
  }

  function flushList(rows: readonly EncargaturaResponse[]) {
    const req = httpMock.expectOne((r) => r.url === '/api/rrhh/encargatura');
    req.flush({ status: 'OK', mensaje: '', data: rows });
  }

  afterEach(() => {
    httpMock.verify();
  });

  // =====================================================================
  // Test 1 — carga inicial popula filas
  // =====================================================================

  it('al iniciar carga listado vía GET /api/rrhh/encargatura', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    flushList([row(1), row(2, { estado: 'CULMINADO', fechaFin: '2026-04-30' })]);
    expect(comp.rows()).toHaveLength(2);
    expect(comp.conteoActivas()).toBe(1);
    expect(comp.conteoCulminadas()).toBe(1);
  });

  // =====================================================================
  // Test 2 — filtro buscador funciona client-side
  // =====================================================================

  it('buscador filtra por titular o encargado en filtradas()', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    flushList([
      row(1, { titularNombre: 'Pérez Juan', encargadoNombre: 'Soto María' }),
      row(2, { titularNombre: 'García Luis', encargadoNombre: 'Vargas Ana' }),
    ]);
    comp.buscador.set('soto');
    expect(comp.filtradas()).toHaveLength(1);
    expect(comp.filtradas()[0].id).toBe(1);

    comp.buscador.set('LUIS');
    expect(comp.filtradas()).toHaveLength(1);
    expect(comp.filtradas()[0].id).toBe(2);

    comp.buscador.set('xx');
    expect(comp.filtradas()).toHaveLength(0);
  });

  // =====================================================================
  // Test 3 — confirmar cerrar dispara PUT y recarga
  // =====================================================================

  it('confirmarCerrar dispara PUT /:id/cerrar al aprobar el confirm', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    flushList([row(500)]);

    // Acceder al dialog inyectado dentro del componente (la instancia raíz
    // puede diferir de TestBed.inject en standalone components — patrón F3.6).
    const dialog = (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog;
    vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as ReturnType<MatDialog['open']>);

    comp.confirmarCerrar(row(500));
    const putReq = httpMock.expectOne('/api/rrhh/encargatura/500/cerrar');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ status: 'OK', mensaje: '', data: row(500, { estado: 'CULMINADO' }) });

    // recarga
    flushList([row(500, { estado: 'CULMINADO', fechaFin: '2026-06-01' })]);
    expect(comp.rows()[0].estado).toBe('CULMINADO');
  });

  // =====================================================================
  // Test 4 — formato fechas en español dd/mm/yyyy
  // =====================================================================

  it('fmtFecha devuelve dd/mm/yyyy y maneja null', () => {
    const fixture = build();
    flushList([]);
    const comp = fixture.componentInstance;
    expect(comp.fmtFecha('2026-05-01')).toBe('01/05/2026');
    expect(comp.fmtFecha(null)).toBe('—');
    expect(comp.fmtFecha(undefined)).toBe('—');
  });
});
