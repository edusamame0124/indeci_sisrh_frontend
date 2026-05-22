import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConceptoPlanillaFormDialogComponent } from './concepto-planilla-form-dialog.component';

describe('ConceptoPlanillaFormDialogComponent (Spec 009 — CRUD Conceptos)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConceptoPlanillaFormDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Nuevo concepto',
            submitLabel: 'Registrar',
            initial: null,
          },
        },
        {
          provide: MatDialogRef,
          useValue: { close: () => undefined },
        },
      ],
    });
  });

  it('cierra con payload normalizado al enviar formulario válido', () => {
    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<
      ConceptoPlanillaFormDialogComponent,
      unknown
    >;
    const spy = vi.spyOn(ref, 'close');
    const fixture = TestBed.createComponent(ConceptoPlanillaFormDialogComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      codigo: ' i-1 ',
      nombre: ' haber ',
      tipo: 'INGRESO',
      naturaleza: ' rem ',
    });
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith({
      codigo: 'I-1',
      nombre: 'HABER',
      tipo: 'INGRESO',
      naturaleza: 'REM',
    });
  });

  it('no cierra si el formulario está vacío', () => {
    const ref = TestBed.inject(MatDialogRef);
    const spy = vi.spyOn(ref, 'close');
    const fixture = TestBed.createComponent(ConceptoPlanillaFormDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });
});
