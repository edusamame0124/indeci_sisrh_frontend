import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { MetaPptoApiService } from '../../../../../../services/meta-ppto-api.service';
import { ErrorMessageService } from '../../../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../../../core/models/error-response.model';
import type { MetaPptoCat } from '../../../../../../models/meta-ppto.model';

export interface MetaFormDialogData {
  meta: MetaPptoCat | null;
  anioFiscal: number;
}

@Component({
  selector: 'app-meta-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './meta-form-dialog.component.html',
  styleUrl: './meta-form-dialog.component.css',
})
export class MetaFormDialogComponent {
  private readonly api    = inject(MetaPptoApiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly notif  = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);
  private readonly fb     = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly esEdicion: boolean;

  readonly form = this.fb.nonNullable.group({
    metaCodigo:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20), Validators.pattern(/^\S.*$/)]],
    centroCosto:           ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    categoriaPresupuestal: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    producto:              ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    actividad:             ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    finalidad:             ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    fuente:                ['', Validators.maxLength(200)],
    observacion:           ['', Validators.maxLength(1000)],
  });

  constructor(
    public readonly dialogRef: MatDialogRef<MetaFormDialogComponent, MetaPptoCat | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: MetaFormDialogData,
  ) {
    this.esEdicion = data.meta !== null;
    if (data.meta) {
      this.form.patchValue({
        metaCodigo:            data.meta.metaCodigo,
        centroCosto:           data.meta.centroCosto,
        categoriaPresupuestal: data.meta.categoriaPresupuestal,
        producto:              data.meta.producto,
        actividad:             data.meta.actividad,
        finalidad:             data.meta.finalidad,
        fuente:                data.meta.fuente ?? '',
        observacion:           data.meta.observacion ?? '',
      });
    }
  }

  guardar(): void {
    if (this.guardando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const dto = {
      anioFiscal:            this.data.anioFiscal,
      metaCodigo:            v.metaCodigo.trim().toUpperCase(),
      centroCosto:           v.centroCosto.trim(),
      categoriaPresupuestal: v.categoriaPresupuestal.trim(),
      producto:              v.producto.trim(),
      actividad:             v.actividad.trim(),
      finalidad:             v.finalidad.trim(),
      fuente:                v.fuente.trim() || null,
      observacion:           v.observacion.trim() || null,
    };
    const obs$ = this.esEdicion && this.data.meta
      ? this.api.editarMeta(this.data.meta.id, dto)
      : this.api.crearMeta(dto);

    obs$.subscribe({
      next: (meta) => {
        this.guardando.set(false);
        this.notif.exito(
          this.esEdicion ? 'Meta actualizada correctamente.' : 'Meta registrada en el catálogo.',
        );
        this.dialogRef.close(meta);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const body = err.error;
        const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
        if (err.status === 409) {
          this.form.controls.metaCodigo.setErrors({ duplicado: true });
          this.form.controls.metaCodigo.markAsTouched();
        }
        this.snack.open(msg, 'Cerrar', { duration: 7000 });
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  /** Longitud actual del código de meta para el contador. */
  get longitudCodigo(): number {
    return this.form.controls.metaCodigo.value?.length ?? 0;
  }
}
