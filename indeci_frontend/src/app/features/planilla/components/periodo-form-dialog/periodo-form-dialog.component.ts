import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { PeriodoPlanillaInput } from '../../models/periodo-planilla.model';

/** Patrón YYYY-MM (ej. 2026-05). */
const PERIODO_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface PeriodoFormDialogData {
  readonly title?: string;
  readonly submitLabel?: string;
  /** Periodos ya registrados — bloquea duplicados en cliente antes del POST. */
  readonly periodosYaRegistrados?: ReadonlySet<string>;
}

/**
 * Dialog Material para crear un periodo de planilla (Spec 009 / T152).
 * Backend solo soporta POST (no PUT). El "editar" del task se mapea a acciones cerrar/reabrir/eliminar
 * que se ejecutan desde la página listado.
 */
@Component({
  selector: 'app-periodo-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './periodo-form-dialog.component.html',
  styleUrl: './periodo-form-dialog.component.css',
})
export class PeriodoFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PeriodoFormDialogComponent, PeriodoPlanillaInput | null>);
  protected readonly data = inject<PeriodoFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly title = this.data.title ?? 'Nuevo periodo';
  readonly submitLabel = this.data.submitLabel ?? 'Crear periodo';

  readonly form = this.fb.nonNullable.group({
    periodo: ['', [Validators.required, Validators.pattern(PERIODO_PATTERN)]],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    observacion: [''],
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) return;

    const raw = this.form.getRawValue();
    const periodo = raw.periodo.trim();

    // Validación cliente — duplicado en el listado
    const yaRegistrados = this.data.periodosYaRegistrados;
    if (yaRegistrados && yaRegistrados.has(periodo)) {
      this.form.controls.periodo.setErrors({ duplicado: true });
      return;
    }

    // Validación cliente — orden de fechas
    if (raw.fechaInicio > raw.fechaFin) {
      this.form.controls.fechaFin.setErrors({ ordenFechas: true });
      return;
    }

    const body: PeriodoPlanillaInput = {
      periodo,
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin,
      observacion: (raw.observacion ?? '').trim(),
    };
    this.dialogRef.close(body);
  }
}
