import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type {
  EmpleadoJornadaExcepcionInput,
  EmpleadoJornadaExcepcionRow,
} from '../../../../../models/empleado-jornada-excepcion.model';

export interface EmpleadoJornadaExcepcionFormDialogData {
  readonly empleadoId: number;
  /** Presente en modo edición; ausente al registrar uno nuevo. */
  readonly row?: EmpleadoJornadaExcepcionRow;
}

/**
 * Registrar/editar un Horario Especial (excepción individual a la jornada del
 * régimen, con vigencia y documento de autorización — decisión RR.HH. 2026-08-08).
 * Devuelve el input al confirmar, o `null` al cancelar.
 */
@Component({
  selector: 'app-empleado-jornada-excepcion-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-jornada-excepcion-form-dialog.component.html',
  styleUrl: './empleado-jornada-excepcion-form-dialog.component.css',
})
export class EmpleadoJornadaExcepcionFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<
    MatDialogRef<EmpleadoJornadaExcepcionFormDialogComponent, EmpleadoJornadaExcepcionInput | null>
  >(MatDialogRef);
  readonly data = inject<EmpleadoJornadaExcepcionFormDialogData>(MAT_DIALOG_DATA);

  readonly esEdicion = this.data.row != null;

  private static readonly HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

  readonly form = this.fb.nonNullable.group({
    fechaInicio: this.fb.control<string | null>(this.data.row?.fechaInicio ?? null, [Validators.required]),
    fechaFin: this.fb.control<string | null>(this.data.row?.fechaFin ?? null, [Validators.required]),
    horaIngreso: this.fb.nonNullable.control(this.data.row?.horaIngreso ?? '', [
      Validators.required,
      Validators.pattern(EmpleadoJornadaExcepcionFormDialogComponent.HORA_PATTERN),
    ]),
    horaSalida: this.fb.nonNullable.control(this.data.row?.horaSalida ?? '', [
      Validators.required,
      Validators.pattern(EmpleadoJornadaExcepcionFormDialogComponent.HORA_PATTERN),
    ]),
    refrigerioInicio: this.fb.nonNullable.control(this.data.row?.refrigerioInicio ?? '', [
      Validators.pattern(EmpleadoJornadaExcepcionFormDialogComponent.HORA_PATTERN),
    ]),
    refrigerioFin: this.fb.nonNullable.control(this.data.row?.refrigerioFin ?? '', [
      Validators.pattern(EmpleadoJornadaExcepcionFormDialogComponent.HORA_PATTERN),
    ]),
    documentoAutorizacion: this.fb.nonNullable.control(this.data.row?.documentoAutorizacion ?? '', [
      Validators.required,
      Validators.maxLength(200),
    ]),
    motivo: this.fb.nonNullable.control(this.data.row?.motivo ?? '', [Validators.maxLength(500)]),
  });

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
      empleadoId: this.data.empleadoId,
      fechaInicio: v.fechaInicio!,
      fechaFin: v.fechaFin!,
      horaIngreso: v.horaIngreso,
      horaSalida: v.horaSalida,
      refrigerioInicio: v.refrigerioInicio?.trim() || null,
      refrigerioFin: v.refrigerioFin?.trim() || null,
      documentoAutorizacion: v.documentoAutorizacion?.trim() || '',
      motivo: v.motivo?.trim() || null,
    });
  }
}
