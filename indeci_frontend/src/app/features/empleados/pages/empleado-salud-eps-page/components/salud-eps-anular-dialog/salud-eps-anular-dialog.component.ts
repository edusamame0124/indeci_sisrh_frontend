import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoSaludEpsApiService } from '../../../../services/empleado-salud-eps-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';

export interface SaludEpsAnularDialogData {
  empleadoId: number;
  coberturaId: number;
  tipo: string;
}

@Component({
  selector: 'app-salud-eps-anular-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salud-eps-anular-dialog.component.html',
  styleUrl: './salud-eps-anular-dialog.component.css',
})
export class SaludEpsAnularDialogComponent {
  private readonly data    = inject<SaludEpsAnularDialogData>(MAT_DIALOG_DATA);
  private readonly ref     = inject(MatDialogRef<SaludEpsAnularDialogComponent>);
  private readonly api     = inject(EmpleadoSaludEpsApiService);
  private readonly notif   = inject(NotificacionService);
  private readonly snack   = inject(MatSnackBar);
  private readonly fb      = inject(FormBuilder);

  readonly tipo    = this.data.tipo;
  readonly saving  = signal(false);

  readonly form = this.fb.group({
    motivo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  readonly sugerencias = [
    'Registro duplicado.',
    'Error en los datos ingresados.',
    'Trabajador cambió de modalidad.',
    'Solicitud del trabajador autorizada por RRHH.',
  ];

  aplicarSugerencia(s: string): void {
    this.form.patchValue({ motivo: s });
    this.form.get('motivo')?.markAsTouched();
  }

  confirmar(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.api.anular(this.data.empleadoId, this.data.coberturaId, {
      motivo: this.form.value.motivo!,
    }).subscribe({
      next: () => {
        this.notif.exito('Cobertura anulada correctamente.');
        this.ref.close(true);
      },
      error: (err: any) => {
        this.snack.open(err?.error?.message ?? 'Error al anular la cobertura.', 'Cerrar', { duration: 7000 });
        this.saving.set(false);
      },
    });
  }
}
