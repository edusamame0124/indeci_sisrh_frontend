import { Component, Inject, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MetaPptoApiService } from '../../../../../../services/meta-ppto-api.service';
import { isErrorResponse } from '../../../../../../../../core/models/error-response.model';
import { ErrorMessageService } from '../../../../../../../../core/services/error-message.service';
import type { MetaPptoCat, MetaPptoEquiv } from '../../../../../../models/meta-ppto.model';

export interface EquivalenciaFormDialogData {
  anioOrigen: number;
  anioDestino: number;
  metasOrigen: MetaPptoCat[];
  metasDestino: MetaPptoCat[];
}

@Component({
  selector: 'app-equivalencia-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './equivalencia-form-dialog.component.html',
  styleUrl: './equivalencia-form-dialog.component.css',
})
export class EquivalenciaFormDialogComponent {
  private readonly api = inject(MetaPptoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly fb = inject(FormBuilder);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    metaOrigenId:  [0, [Validators.required, Validators.min(1)]],
    metaDestinoId: [0, [Validators.required, Validators.min(1)]],
    observacion:   [''],
  });

  constructor(
    public readonly dialogRef: MatDialogRef<EquivalenciaFormDialogComponent, MetaPptoEquiv | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EquivalenciaFormDialogData,
  ) {}

  guardar(): void {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    const v = this.form.getRawValue();
    this.api.crearEquivalencia({
      anioOrigen:    this.data.anioOrigen,
      metaOrigenId:  v.metaOrigenId,
      anioDestino:   this.data.anioDestino,
      metaDestinoId: v.metaDestinoId,
      observacion:   v.observacion.trim() || null,
    }).subscribe({
      next: (equiv) => {
        this.guardando.set(false);
        this.snack.open('Equivalencia registrada correctamente.', 'Cerrar', { duration: 4000 });
        this.dialogRef.close(equiv);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const body = err.error;
        const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 7000 });
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
