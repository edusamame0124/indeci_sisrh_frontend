import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { PlanillaTipoInput } from '../../models/planilla-tipo.model';

/** Datos de apertura del form-dialog (alta vs edición). */
export interface PlanillaTipoFormDialogData {
  readonly title: string;
  /** `'crear'` habilita el campo código; `'editar'` lo bloquea (es la PK). */
  readonly modo: 'crear' | 'editar';
  readonly submitLabel: string;
  /** Valores iniciales (edición) o `null` en alta. */
  readonly initial: PlanillaTipoInput | null;
}

/**
 * Form-dialog del catálogo "Tipo de planilla" (SPEC_CONCEPTOS_PLANILLA §15).
 * Alta/edición: código (PK, solo alta), nombre, orden y activo.
 * El código se normaliza a MAYÚSCULAS; el nombre se recorta y normaliza.
 */
@Component({
  selector: 'app-planilla-tipo-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planilla-tipo-form-dialog.component.html',
  styleUrl: './planilla-tipo-form-dialog.component.css',
})
export class PlanillaTipoFormDialogComponent {
  readonly data: PlanillaTipoFormDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(
    MatDialogRef<PlanillaTipoFormDialogComponent, PlanillaTipoInput | undefined>,
  );
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    codigo: this.fb.nonNullable.control(this.data.initial?.codigo ?? '', {
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    nombre: this.fb.nonNullable.control(this.data.initial?.nombre ?? '', {
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    orden: this.fb.nonNullable.control(this.data.initial?.orden ?? 1, {
      validators: [Validators.required, Validators.min(0), Validators.max(999)],
    }),
    activo: this.fb.nonNullable.control((this.data.initial?.activo ?? 1) === 1),
  });

  constructor() {
    if (this.data.modo === 'editar') {
      this.form.controls.codigo.disable();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      codigo: v.codigo.trim().toUpperCase(),
      nombre: v.nombre.trim().toUpperCase(),
      orden: v.orden,
      activo: v.activo ? 1 : 0,
    });
  }
}
