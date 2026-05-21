import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { ConceptoPlanillaInput, ConceptoPlanillaTipo } from '../../models/concepto-planilla.model';

export interface ConceptoPlanillaFormDialogData {
  readonly title: string;
  readonly submitLabel: string;
  /** `null` = alta; fila existente = edición (campos precargados). */
  readonly initial: ConceptoPlanillaInput | null;
}

@Component({
  selector: 'app-concepto-planilla-form-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepto-planilla-form-dialog.component.html',
  styleUrl: './concepto-planilla-form-dialog.component.css',
})
export class ConceptoPlanillaFormDialogComponent {
  readonly data: ConceptoPlanillaFormDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(
    MatDialogRef<ConceptoPlanillaFormDialogComponent, ConceptoPlanillaInput | undefined>,
  );
  private readonly fb = inject(FormBuilder);

  readonly tipos: readonly ConceptoPlanillaTipo[] = ['INGRESO', 'DESCUENTO'];

  readonly form = this.fb.group({
    codigo: this.fb.nonNullable.control(this.data.initial?.codigo ?? '', {
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    nombre: this.fb.nonNullable.control(this.data.initial?.nombre ?? '', {
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    tipo: this.fb.nonNullable.control<ConceptoPlanillaTipo>(
      this.data.initial?.tipo ?? 'INGRESO',
      { validators: [Validators.required] },
    ),
    naturaleza: this.fb.nonNullable.control(this.data.initial?.naturaleza ?? '', {
      validators: [Validators.required, Validators.maxLength(120)],
    }),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: ConceptoPlanillaInput = {
      codigo: v.codigo.trim().toUpperCase(),
      nombre: v.nombre.trim().toUpperCase(),
      tipo: v.tipo,
      naturaleza: v.naturaleza.trim().toUpperCase(),
    };
    this.dialogRef.close(body);
  }
}
