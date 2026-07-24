import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** Sugerencias rápidas de sustento para la provisión masiva. */
const SUSTENTOS_SUGERIDOS: readonly string[] = [
  'Consolidación post-importación baseline 2026',
  'Recálculo masivo de días que corresponden y saldo',
  'Provisión regular de ley (lote)'
];

/**
 * Diálogo del botón "Provisionar para todos" (Padrón Vacacional). Recolecta el sustento
 * obligatorio del lote; el recálculo conserva los gozados importados y solo recalcula
 * Corresponden y Saldo para todos los empleados importados.
 */
@Component({
  selector: 'app-provisionar-todos-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './provisionar-todos-dialog.component.html',
  styleUrl: './provisionar-todos-dialog.component.css'
})
export class ProvisionarTodosDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ProvisionarTodosDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly sugerencias = SUSTENTOS_SUGERIDOS;

  readonly form = this.fb.group({
    sustento: ['', [Validators.required]]
  });

  aplicarSugerencia(texto: string): void {
    this.form.patchValue({ sustento: texto });
  }

  confirmar(): void {
    const sustento = (this.form.value.sustento ?? '').trim();
    if (!sustento) {
      return;
    }
    this.dialogRef.close({ sustento });
  }
}
