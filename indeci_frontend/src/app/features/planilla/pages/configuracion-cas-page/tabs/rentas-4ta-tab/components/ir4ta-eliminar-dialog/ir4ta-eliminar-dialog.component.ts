import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import type { Ir4taConfigRow } from '../../../../../../models/ir4ta-config.model';

export interface Ir4taEliminarDialogData {
  row: Ir4taConfigRow;
}

@Component({
  selector: 'app-ir4ta-eliminar-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ir4ta-eliminar-dialog.component.html',
  styleUrl: './ir4ta-eliminar-dialog.component.css',
})
export class Ir4taEliminarDialogComponent {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(Ir4taConfigApiService);
  private readonly dialogRef = inject(MatDialogRef<Ir4taEliminarDialogComponent>);
  readonly data              = inject<Ir4taEliminarDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    motivo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  readonly motivosSugeridos = [
    'Vigencia creada con datos incorrectos.',
    'Vigencia duplicada por error de ingreso.',
    'Año fiscal ya cubierto por otra vigencia válida.',
    'Cambio de normativa: registro reemplazado por nueva vigencia validada.',
  ] as const;

  aplicarSugerencia(s: string): void {
    this.form.patchValue({ motivo: s });
    this.form.markAsDirty();
  }

  confirmar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set(null);
    this.api.eliminar(this.data.row.id, { motivo: this.form.value.motivo! }).subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'No se pudo anular la vigencia. Verifique e intente nuevamente.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
