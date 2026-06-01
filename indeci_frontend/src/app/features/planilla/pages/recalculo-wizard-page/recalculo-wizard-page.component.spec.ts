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
import { RecalculoWizardPageComponent } from './recalculo-wizard-page.component';
import type {
  RecalculoPreviewResponse,
  RecalculoResultadoResponse,
} from '../../models/recalculo.model';

/**
 * F3.4f — Tests del Asistente de Recálculo.
 */
describe('RecalculoWizardPageComponent (F3.4)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [RecalculoWizardPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RecalculoWizardPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function previewBody(items: RecalculoPreviewResponse['items']): RecalculoPreviewResponse {
    return {
      periodo: '2026-05',
      criterioTipo: 'TODOS',
      total: items.length,
      items,
    };
  }

  function flushPreview(body: RecalculoPreviewResponse) {
    const req = httpMock.expectOne((r) =>
      r.url === '/api/rrhh/recalculo/preview' &&
      r.params.get('periodo') === '2026-05',
    );
    req.flush({ status: 'OK', mensaje: '', data: body });
  }

  function flushEjecutar(body: RecalculoResultadoResponse) {
    const req = httpMock.expectOne('/api/rrhh/recalculo/ejecutar?periodo=2026-05');
    req.flush({ status: 'OK', mensaje: '', data: body });
  }

  afterEach(() => {
    httpMock.verify();
  });

  // =====================================================================
  // Test 1 — período inválido bloquea avance al paso 2
  // =====================================================================

  it('si el período es inválido, ver-alcance no hace HTTP', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.paso1.controls.periodo.setValue('XXX');
    comp.cargarPreview();
    httpMock.expectNone((r) => r.url === '/api/rrhh/recalculo/preview');
    expect(comp.preview()).toBeNull();
  });

  // =====================================================================
  // Test 2 — criterio REGIMEN_LABORAL incluye valorString en el body
  // =====================================================================

  it('REGIMEN_LABORAL envía valorString al backend', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.paso1.controls.periodo.setValue('2026-05');
    comp.paso1.controls.tipo.setValue('REGIMEN_LABORAL');
    comp.paso1.controls.regimen.setValue('CAS');
    comp.cargarPreview();
    const req = httpMock.expectOne((r) =>
      r.url === '/api/rrhh/recalculo/preview' &&
      r.params.get('periodo') === '2026-05',
    );
    expect(req.request.body).toMatchObject({
      tipo: 'REGIMEN_LABORAL',
      valorString: 'CAS',
      valorListaIds: null,
    });
    req.flush({ status: 'OK', mensaje: '', data: previewBody([]) });
  });

  // =====================================================================
  // Test 3 — EMPLEADOS_LISTA con textarea vacío bloquea HTTP
  // =====================================================================

  it('EMPLEADOS_LISTA sin IDs no llama backend y muestra error', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.paso1.controls.periodo.setValue('2026-05');
    comp.paso1.controls.tipo.setValue('EMPLEADOS_LISTA');
    comp.paso1.controls.listaIdsTexto.setValue('');
    comp.cargarPreview();
    httpMock.expectNone((r) => r.url === '/api/rrhh/recalculo/preview');
    expect(comp.errorMsg()).toContain('ID');
  });

  // =====================================================================
  // Test 4 — preview popula items y total
  // =====================================================================

  it('cargarPreview popula la respuesta y avanza la fase', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.paso1.controls.periodo.setValue('2026-05');
    comp.cargarPreview();
    flushPreview(previewBody([
      {
        empleadoId: 10,
        nombreCompleto: 'Pérez Juan',
        regimenLaboralCodigo: '728',
        netoActual: 2500,
        tieneMovimientoPrevio: true,
      },
    ]));
    expect(comp.preview()?.total).toBe(1);
    expect(comp.preview()?.items[0].empleadoId).toBe(10);
    expect(comp.fase()).toBe('preview-listo');
  });

  // =====================================================================
  // Test 5 — confirmar + ejecutar dispara POST y guarda resultado
  // =====================================================================

  it('confirmarEjecutar pide confirm y al aprobar dispara POST /ejecutar', () => {
    const fixture = build();
    const comp = fixture.componentInstance;

    // Cargar preview para tener algo que ejecutar.
    comp.paso1.controls.periodo.setValue('2026-05');
    comp.cargarPreview();
    flushPreview(previewBody([
      {
        empleadoId: 10,
        nombreCompleto: 'Pérez Juan',
        regimenLaboralCodigo: '728',
        netoActual: 2500,
        tieneMovimientoPrevio: true,
      },
    ]));

    // Mock del dialog: simulamos OK del usuario.
    const dialog = (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog;
    const open = vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as ReturnType<MatDialog['open']>);

    comp.confirmarEjecutar();
    expect(open).toHaveBeenCalled();

    flushEjecutar({
      periodo: '2026-05',
      total: 1,
      exitosos: 1,
      fallidos: 0,
      totalDelta: 200,
      items: [
        {
          empleadoId: 10,
          nombreCompleto: 'Pérez Juan',
          status: 'OK',
          netoAnterior: 2500,
          netoNuevo: 2700,
          delta: 200,
          razon: null,
        },
      ],
    });

    expect(comp.fase()).toBe('completado');
    expect(comp.resultado()?.exitosos).toBe(1);
    expect(comp.resultado()?.totalDelta).toBe(200);
  });
});
