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
import { MatIconModule } from '@angular/material/icon';
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
 * Alta: nombre (3-120 chars), descripcion (max 300) y activo.
 * El código y orden son generados por el backend.
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
    MatIconModule,
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
    nombre: this.fb.nonNullable.control(this.data.initial?.nombre ?? '', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(120)],
    }),
    descripcion: this.fb.control(this.data.initial?.descripcion ?? '', {
      validators: [Validators.maxLength(300)],
    }),
    activo: this.fb.nonNullable.control((this.data.initial?.activo ?? 1) === 1),
  });

  constructor() {
    // Si estuviéramos editando un elemento existente, acá podríamos deshabilitar algo
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      nombre: v.nombre.trim(),
      descripcion: (v.descripcion && v.descripcion.trim().length > 0) ? v.descripcion.trim() : undefined,
      activo: v.activo ? 1 : 0,
    } as PlanillaTipoInput);
  }
}
