import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import {
  EmpleadoConceptoFormDialogComponent,
  atLeastOneConceptoValor,
  vigenciaRangoValido,
} from './empleado-concepto-form-dialog.component';
import { ConceptoPlanillaApiService } from '../../../catalogos/services/concepto-planilla-api.service';
import { EstimacionNetoApiService } from '../../services/estimacion-neto-api.service';

describe('EmpleadoConceptoFormDialogComponent (Spec 013/C1 — modal descuento/ajuste)', () => {
  const conceptoActivo = {
    id: 3,
    codigo: 'REM',
    nombre: 'Sueldo Básico',
    tipo: 'INGRESO' as const,
    naturaleza: 'FIJO',
    activo: 1,
    codigoMef: '00301',
    codigoSisper: null,
    tipoConcepto: 'REMUNERATIVO' as const,
  };

  // Preview de neto: mock que siempre cumple la REGLA SERVIR-07.
  const estimacionApiMock = {
    estimarNeto: () =>
      of({
        netoActual: 3000,
        netoEstimado: 2900,
        diferencia: -100,
        cumpleRegla50: true,
        mensajeAlerta: null,
      }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadoConceptoFormDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            empleadoId: 42,
            title: 'Asignar Descuento / Ajuste Manual',
            submitLabel: 'Guardar',
            conceptosYaAsignadosIds: new Set<number>(),
          },
        },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: ConceptoPlanillaApiService,
          useValue: { listar: () => of([conceptoActivo]) },
        },
        { provide: EstimacionNetoApiService, useValue: estimacionApiMock },
      ],
    });
  });

  it('cierra con payload cuando hay concepto, monto y vigencia', () => {
    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<
      EmpleadoConceptoFormDialogComponent,
      unknown
    >;
    const spy = vi.spyOn(ref, 'close');
    const fixture = TestBed.createComponent(EmpleadoConceptoFormDialogComponent);
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      conceptoPlanillaId: 3,
      monto: 100,
      porcentaje: null,
      fechaInicio: '2026-05',
      fechaFin: '',
    });
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith({
      empleadoId: 42,
      conceptoPlanillaId: 3,
      monto: 100,
      porcentaje: null,
      formula: null,
      fechaInicio: '2026-05-01',
      fechaFin: null,
    });
  });

  it('no cierra si falta la vigencia de inicio', () => {
    const ref = TestBed.inject(MatDialogRef);
    const spy = vi.spyOn(ref, 'close');
    const fixture = TestBed.createComponent(EmpleadoConceptoFormDialogComponent);
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      conceptoPlanillaId: 3,
      monto: 100,
      porcentaje: null,
      fechaInicio: '',
      fechaFin: '',
    });
    cmp.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('no cierra si falta monto y porcentaje', () => {
    const ref = TestBed.inject(MatDialogRef);
    const spy = vi.spyOn(ref, 'close');
    const fixture = TestBed.createComponent(EmpleadoConceptoFormDialogComponent);
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      conceptoPlanillaId: 3,
      monto: null,
      porcentaje: null,
      fechaInicio: '2026-05',
      fechaFin: '',
    });
    cmp.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('atLeastOneConceptoValor acepta monto o porcentaje (fórmula eliminada)', () => {
    const fb = new FormBuilder();
    const g = fb.group(
      {
        monto: fb.control<number | null>(null),
        porcentaje: fb.control<number | null>(null),
      },
      { validators: [atLeastOneConceptoValor()] },
    );

    expect(g.hasError('valorRequerido')).toBe(true);
    g.patchValue({ monto: 50 });
    expect(g.hasError('valorRequerido')).toBe(false);
    g.patchValue({ monto: null, porcentaje: 0.5 });
    expect(g.hasError('valorRequerido')).toBe(false);
  });

  it('vigenciaRangoValido rechaza una fecha fin anterior a la de inicio', () => {
    const fb = new FormBuilder();
    const g = fb.group(
      {
        fechaInicio: fb.nonNullable.control('2026-05'),
        fechaFin: fb.nonNullable.control('2026-03'),
      },
      { validators: [vigenciaRangoValido()] },
    );

    expect(g.hasError('vigenciaInvalida')).toBe(true);
    g.patchValue({ fechaFin: '2026-08' });
    expect(g.hasError('vigenciaInvalida')).toBe(false);
    g.patchValue({ fechaFin: '' });
    expect(g.hasError('vigenciaInvalida')).toBe(false);
  });
});
