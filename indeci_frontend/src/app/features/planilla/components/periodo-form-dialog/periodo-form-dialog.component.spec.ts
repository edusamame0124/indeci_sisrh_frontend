import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PeriodoFormDialogComponent } from './periodo-form-dialog.component';
import type { PeriodoFormDialogData } from './periodo-form-dialog.component';
import type { PeriodoPlanillaInput } from '../../models/periodo-planilla.model';

describe('PeriodoFormDialogComponent (Spec 009 / T152)', () => {
  let closeSpy: (value: PeriodoPlanillaInput | null) => void;
  let lastClosedWith: PeriodoPlanillaInput | null | undefined;

  function build(data?: PeriodoFormDialogData) {
    lastClosedWith = undefined;
    closeSpy = (value) => {
      lastClosedWith = value;
    };
    TestBed.configureTestingModule({
      imports: [PeriodoFormDialogComponent],
      providers: [
        provideAnimationsAsync('noop'),
        {
          provide: MatDialogRef,
          useValue: { close: (v: PeriodoPlanillaInput | null) => closeSpy(v) },
        },
        { provide: MAT_DIALOG_DATA, useValue: data ?? {} },
      ],
    });
    const fixture = TestBed.createComponent(PeriodoFormDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('declara los 4 controles con periodo + fechas requeridos', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    expect(Object.keys(comp.form.controls).sort()).toEqual(
      ['periodo', 'fechaInicio', 'fechaFin', 'observacion'].sort(),
    );
    expect(comp.form.controls.periodo.hasError('required')).toBe(true);
    expect(comp.form.controls.fechaInicio.hasError('required')).toBe(true);
    expect(comp.form.controls.fechaFin.hasError('required')).toBe(true);
  });

  it('rechaza periodo con formato distinto de YYYY-MM', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.form.controls.periodo.setValue('mayo-2026');
    expect(comp.form.controls.periodo.hasError('pattern')).toBe(true);
    comp.form.controls.periodo.setValue('2026-13');
    expect(comp.form.controls.periodo.hasError('pattern')).toBe(true);
    comp.form.controls.periodo.setValue('2026-05');
    expect(comp.form.controls.periodo.hasError('pattern')).toBe(false);
  });

  it('cancelar() cierra el dialog con null', () => {
    const fixture = build();
    fixture.componentInstance.cancelar();
    expect(lastClosedWith).toBeNull();
  });

  it('guardar() con form válido cierra con PeriodoPlanillaInput (observacion trimeada)', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.form.setValue({
      periodo: '2026-05',
      fechaInicio: '2026-05-01',
      fechaFin: '2026-05-31',
      observacion: '  Planilla mayo  ',
    });
    comp.guardar();
    expect(lastClosedWith).toEqual({
      periodo: '2026-05',
      fechaInicio: '2026-05-01',
      fechaFin: '2026-05-31',
      observacion: 'Planilla mayo',
    });
  });

  it('guardar() bloquea fechaFin < fechaInicio', () => {
    const fixture = build();
    const comp = fixture.componentInstance;
    comp.form.setValue({
      periodo: '2026-05',
      fechaInicio: '2026-05-31',
      fechaFin: '2026-05-01',
      observacion: '',
    });
    comp.guardar();
    expect(comp.form.controls.fechaFin.hasError('ordenFechas')).toBe(true);
    expect(lastClosedWith).toBeUndefined();
  });

  it('guardar() bloquea duplicado contra periodosYaRegistrados', () => {
    const fixture = build({
      periodosYaRegistrados: new Set(['2026-05']),
    });
    const comp = fixture.componentInstance;
    comp.form.setValue({
      periodo: '2026-05',
      fechaInicio: '2026-05-01',
      fechaFin: '2026-05-31',
      observacion: '',
    });
    comp.guardar();
    expect(comp.form.controls.periodo.hasError('duplicado')).toBe(true);
    expect(lastClosedWith).toBeUndefined();
  });

  it('guardar() con form inválido no cierra', () => {
    const fixture = build();
    fixture.componentInstance.guardar();
    expect(lastClosedWith).toBeUndefined();
  });
});
