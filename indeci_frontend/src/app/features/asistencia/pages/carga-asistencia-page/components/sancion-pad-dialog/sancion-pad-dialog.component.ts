import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface SancionPadDialogData {
  readonly fecha: string;
  readonly motivoActual: string | null;
}

/**
 * Modal para marcar/editar un día como "Sanción por PAD" en el calendario de
 * Asistencia por empleado. Es solo de captura local (no llama al backend): el
 * componente padre aplica el resultado sobre el signal `dias` y lo persiste
 * recién al pulsar "Guardar asistencia" (igual que el resto del calendario).
 */
@Component({
  selector: 'app-sancion-pad-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sancion-pad-dialog.component.html',
  styleUrl: './sancion-pad-dialog.component.css',
})
export class SancionPadDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SancionPadDialogComponent>);
  readonly data = inject<SancionPadDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.group({
    motivo: [
      this.data.motivoActual ?? '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    ],
  });

  aplicar(): void {
    if (this.form.invalid) return;
    const motivo = (this.form.controls.motivo.value ?? '').trim();
    this.dialogRef.close(motivo);
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
