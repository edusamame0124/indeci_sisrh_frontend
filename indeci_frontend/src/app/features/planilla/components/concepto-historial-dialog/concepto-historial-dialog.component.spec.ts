import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ConceptoHistorialDialogComponent,
  type ConceptoHistorialDialogData,
} from './concepto-historial-dialog.component';

const DATA: ConceptoHistorialDialogData = {
  id: 5,
  codigo: '0703',
  nombre: 'DESC. AUTORIZADO',
};

const HISTORIAL = {
  estado: 'OK',
  mensaje: 'ok',
  data: {
    versiones: [
      { id: 9, version: 2, vigIni: '2026-07-01', vigFin: null, estado: 'BORRADOR', vigente: false },
      { id: 5, version: 1, vigIni: '2026-01-01', vigFin: '2026-06-30', estado: 'ACTIVO', vigente: true },
    ],
    auditoria: [
      { accion: 'CREAR_VERSION', usuario: 'jperez', fecha: '2026-06-24T10:00:00', detalle: 'v2' },
    ],
  },
};

function setup(close = vi.fn()) {
  TestBed.configureTestingModule({
    imports: [ConceptoHistorialDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: DATA },
      { provide: MatDialogRef, useValue: { close } },
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ConceptoHistorialDialogComponent);
  fixture.detectChanges();
  return { fixture, http, cmp: fixture.componentInstance, close };
}

describe('ConceptoHistorialDialogComponent (SPEC_CONCEPTOS_PLANILLA §12 · D5)', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('carga versiones y auditoría al abrir', () => {
    const s = setup();
    http = s.http;
    http.expectOne('/api/rrhh/concepto-planilla/5/historial').flush(HISTORIAL);
    expect(s.cmp.loading()).toBe(false);
    expect(s.cmp.versiones().length).toBe(2);
    expect(s.cmp.auditoria().length).toBe(1);
  });

  it('marca el rango de vigencia abierto como "vigente"', () => {
    const s = setup();
    http = s.http;
    http.expectOne('/api/rrhh/concepto-planilla/5/historial').flush(HISTORIAL);
    const abierta = s.cmp.versiones().find((v) => v.id === 9)!;
    expect(s.cmp.rangoVigencia(abierta)).toBe('2026-07-01 → vigente');
  });

  it('expone severidad institucional por estado', () => {
    const s = setup();
    http = s.http;
    http.expectOne('/api/rrhh/concepto-planilla/5/historial').flush(HISTORIAL);
    expect(s.cmp.severityEstado('ACTIVO')).toBe('success');
    expect(s.cmp.severityEstado('ANULADO')).toBe('danger');
  });

  it('muestra error cuando el backend falla', () => {
    const s = setup();
    http = s.http;
    http
      .expectOne('/api/rrhh/concepto-planilla/5/historial')
      .flush({ estado: 'ERROR', mensaje: 'fallo' }, { status: 500, statusText: 'Error' });
    expect(s.cmp.loading()).toBe(false);
    expect(s.cmp.loadError()).toBeTruthy();
  });
});
