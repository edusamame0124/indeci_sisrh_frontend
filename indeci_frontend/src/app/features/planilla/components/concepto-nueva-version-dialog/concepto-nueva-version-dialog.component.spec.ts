import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ConceptoNuevaVersionDialogComponent,
  type ConceptoNuevaVersionDialogData,
} from './concepto-nueva-version-dialog.component';

function setup(data: ConceptoNuevaVersionDialogData, close = vi.fn()) {
  TestBed.configureTestingModule({
    imports: [ConceptoNuevaVersionDialogComponent, NoopAnimationsModule],
    providers: [
      provideNativeDateAdapter(),
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  const fixture = TestBed.createComponent(ConceptoNuevaVersionDialogComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, close };
}

const DATA: ConceptoNuevaVersionDialogData = {
  codigo: '0703',
  nombre: 'DESC. AUTORIZADO',
  versionActual: 1,
};

describe('ConceptoNuevaVersionDialogComponent (SPEC_CONCEPTOS_PLANILLA §12 · D5)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('no permite guardar sin fecha (campo requerido)', () => {
    const { cmp, close } = setup(DATA);
    expect(cmp.puedeGuardar()).toBe(false);
    cmp.confirmar();
    expect(close).not.toHaveBeenCalled();
  });

  it('al confirmar devuelve la fecha en ISO yyyy-MM-dd', () => {
    const { cmp, close } = setup(DATA);
    cmp.form.controls.fechaVigIni.setValue(new Date(2026, 6, 1)); // 2026-07-01
    expect(cmp.puedeGuardar()).toBe(true);
    cmp.confirmar();
    expect(close).toHaveBeenCalledWith('2026-07-01');
  });

  it('cancelar cierra sin valor', () => {
    const { cmp, close } = setup(DATA);
    cmp.cancelar();
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
