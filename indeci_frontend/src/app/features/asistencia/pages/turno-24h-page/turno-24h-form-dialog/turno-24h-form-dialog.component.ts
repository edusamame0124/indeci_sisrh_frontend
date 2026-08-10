import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EmpleadoAutocompleteComponent } from '../../../../empleados/components/empleado-autocomplete/empleado-autocomplete.component';
import type { PersonaEmpleado } from '../../../../empleados/models/persona-empleado.model';
import type {
  EmpleadoTurno24hInput,
  EmpleadoTurno24hRow,
} from '../../../models/empleado-turno-24h.model';

export interface Turno24hFormDialogData {
  readonly empleados: readonly PersonaEmpleado[];
  /** Presente en modo edición; ausente al registrar uno nuevo. */
  readonly row?: EmpleadoTurno24hRow;
}

/**
 * Registrar/editar un turno continuo 24h (guardia COEN) — directiva RIS INDECI
 * 2026-08-09. Devuelve el input al confirmar, o `null` al cancelar.
 */
@Component({
  selector: 'app-turno-24h-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    EmpleadoAutocompleteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './turno-24h-form-dialog.component.html',
  styleUrl: './turno-24h-form-dialog.component.css',
})
export class Turno24hFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<
    MatDialogRef<Turno24hFormDialogComponent, EmpleadoTurno24hInput | null>
  >(MatDialogRef);
  readonly data = inject<Turno24hFormDialogData>(MAT_DIALOG_DATA);

  readonly esEdicion = this.data.row != null;
  readonly empleados = this.data.empleados;

  readonly form = this.fb.nonNullable.group({
    empleadoId: this.fb.control<number | null>(this.data.row?.empleadoId ?? null, [
      Validators.required,
    ]),
    fechaInicio: this.fb.control<string | null>(this.data.row?.fechaInicio ?? null, [
      Validators.required,
    ]),
    fechaFin: this.fb.control<string | null>(this.data.row?.fechaFin ?? null, [
      Validators.required,
    ]),
    documentoAutorizacion: this.fb.nonNullable.control(this.data.row?.documentoAutorizacion ?? '', [
      Validators.required,
      Validators.maxLength(200),
    ]),
    motivo: this.fb.nonNullable.control(this.data.row?.motivo ?? '', [Validators.maxLength(500)]),
  });

  onEmpleadoChange(empleadoId: number | null): void {
    this.form.controls.empleadoId.setValue(empleadoId);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      empleadoId: v.empleadoId!,
      fechaInicio: v.fechaInicio!,
      fechaFin: v.fechaFin!,
      documentoAutorizacion: v.documentoAutorizacion?.trim() || '',
      motivo: v.motivo?.trim() || null,
    });
  }
}
