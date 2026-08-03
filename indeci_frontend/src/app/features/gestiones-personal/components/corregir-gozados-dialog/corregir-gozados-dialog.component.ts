import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PadronVacacionalRowDto } from '../../models/padron-vacacional.model';

@Component({
  selector: 'app-corregir-gozados-dialog',
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
  templateUrl: './corregir-gozados-dialog.component.html',
  styleUrl: './corregir-gozados-dialog.component.css'
})
export class CorregirGozadosDialogComponent {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<CorregirGozadosDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    nuevoTotalGozado: [this.data.diasGozados, [Validators.required, Validators.min(0)]],
    motivo: ['', [Validators.required]]
  });

  /** Diferencia previsualizada — positiva descuenta saldo, negativa lo libera. */
  get delta(): number {
    const nuevo = this.form.value.nuevoTotalGozado;
    return nuevo == null ? 0 : nuevo - this.data.diasGozados;
  }

  confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    const nuevoTotalGozado = Number(this.form.value.nuevoTotalGozado);
    const motivo = (this.form.value.motivo ?? '').trim();
    if (!motivo) {
      return;
    }
    this.dialogRef.close({ nuevoTotalGozado, motivo });
  }
}
