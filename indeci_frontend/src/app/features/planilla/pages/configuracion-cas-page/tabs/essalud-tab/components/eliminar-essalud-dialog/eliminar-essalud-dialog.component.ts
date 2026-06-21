import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EssaludApiService } from '../../../../../../services/essalud-api.service';
import type { EssaludVigenciaRow } from '../../../../../../models/essalud.model';

export interface EliminarEssaludDialogData { row: EssaludVigenciaRow; }

@Component({
  selector: 'app-eliminar-essalud-dialog',
  standalone: true,
  imports: [
    DecimalPipe, SlicePipe,
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatIconModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './eliminar-essalud-dialog.component.html',
  styleUrl: './eliminar-essalud-dialog.component.css',
})
export class EliminarEssaludDialogComponent {
  private readonly api       = inject(EssaludApiService);
  private readonly dialogRef = inject(MatDialogRef<EliminarEssaludDialogComponent>);
  readonly data              = inject<EliminarEssaludDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = inject(FormBuilder).group({
    motivo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });

  readonly motivosSugeridos = [
    'Vigencia duplicada por error.',
    'Vigencia creada con fechas incorrectas.',
    'Parámetros ingresados por error de carga.',
    'Registro reemplazado por nueva vigencia validada.',
  ] as const;

  aplicarSugerencia(s: string): void {
    this.form.patchValue({ motivo: s });
    this.form.get('motivo')?.markAsTouched();
    this.form.markAsDirty();
  }

  confirmar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set(null);
    this.api.eliminarVigencia(this.data.row.id, { motivo: this.form.value.motivo! }).subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'No se pudo anular la vigencia EsSalud.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
