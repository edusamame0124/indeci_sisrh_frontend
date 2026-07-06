import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  MotivoReintegro,
  ReintegroMontoApiService,
} from '../../../../services/reintegro-monto-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';

export interface RegistrarReintegroDialogData {
  periodo: string;
}

/** Validador: rechaza cadenas compuestas solo por espacios (Poka-Yoke N° resolución). */
function noBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length === 0 ? { blank: true } : null;
}

@Component({
  selector: 'app-registrar-reintegro-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
  ],
  templateUrl: './registrar-reintegro-dialog.component.html',
  styleUrls: ['./registrar-reintegro-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarReintegroDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReintegroMontoApiService);
  private readonly notificacion = inject(NotificacionService);
  private readonly errorMessage = inject(ErrorMessageService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<RegistrarReintegroDialogComponent>);
  readonly data = inject<RegistrarReintegroDialogData>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);

  readonly motivos: readonly { value: MotivoReintegro; label: string }[] = [
    { value: 'DEVENGADO_JUDICIAL', label: 'Devengado judicial (sentencia / laudo / conciliación)' },
    { value: 'REPOSICION', label: 'Reposición / reincorporación' },
    { value: 'RETROACTIVO', label: 'Retroactivo (asignación / bonificación tardía)' },
    { value: 'DIFERENCIA_REMUNERATIVA', label: 'Diferencia remunerativa (escala / rol)' },
  ];

  readonly form = this.fb.nonNullable.group({
    empleadoId: this.fb.nonNullable.control<number | null>(null, [Validators.required, Validators.min(1)]),
    motivo: this.fb.nonNullable.control<MotivoReintegro | null>(null, [Validators.required]),
    monto: this.fb.nonNullable.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    sustento: this.fb.nonNullable.control<string>('', [Validators.required, noBlank]),
  });

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.api.registrar({
      empleadoId: v.empleadoId!,
      periodoDestino: this.data.periodo,
      monto: v.monto!,
      motivo: v.motivo!,
      sustento: v.sustento.trim(),
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito('Reintegro registrado en estado PENDIENTE.');
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const body = err.error;
        const msg = isErrorResponse(body)
          ? this.errorMessage.translate(body.mensaje)
          : 'No se pudo registrar el reintegro. Verifique los datos e intente nuevamente.';
        this.snack.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
