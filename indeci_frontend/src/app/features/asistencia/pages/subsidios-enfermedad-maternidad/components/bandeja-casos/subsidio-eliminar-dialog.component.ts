import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface SubsidioEliminarDialogData {
  readonly codigoCaso: string;
  readonly nombreEmpleado: string | null;
}

/**
 * Diálogo de eliminación (anulación lógica) de un caso de subsidio.
 * Devuelve el sustento (string) al confirmar, o `null` al cancelar.
 * Base: SPEC Subsidios — la baja queda como evento ELIMINACION en el timeline.
 */
@Component({
  selector: 'app-subsidio-eliminar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subsidio-eliminar-dialog.component.html',
  styleUrl: './subsidio-eliminar-dialog.component.css',
})
export class SubsidioEliminarDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<SubsidioEliminarDialogComponent, string | null>>(MatDialogRef);
  readonly data = inject<SubsidioEliminarDialogData>(MAT_DIALOG_DATA);

  readonly sustentoCtrl = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.minLength(5),
    Validators.maxLength(255),
  ]);

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    if (this.sustentoCtrl.invalid) {
      this.sustentoCtrl.markAsTouched();
      return;
    }
    this.dialogRef.close(this.sustentoCtrl.value.trim());
  }
}
