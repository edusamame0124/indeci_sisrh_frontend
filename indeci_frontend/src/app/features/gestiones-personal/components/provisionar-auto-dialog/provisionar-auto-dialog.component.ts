import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PadronVacacionalRowDto } from '../../models/padron-vacacional.model';

/** Sugerencias rápidas — un clic autocompleta el textarea, evita "fatiga del operador". */
const SUSTENTOS_SUGERIDOS: readonly string[] = [
  'Provisión regular de ley',
  'Corrección de historial importado de Excel',
  'Regularización por actualización de vínculo contractual'
];

@Component({
  selector: 'app-provisionar-auto-dialog',
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
  templateUrl: './provisionar-auto-dialog.component.html',
  styleUrl: './provisionar-auto-dialog.component.css'
})
export class ProvisionarAutoDialogComponent {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ProvisionarAutoDialogComponent>);
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
