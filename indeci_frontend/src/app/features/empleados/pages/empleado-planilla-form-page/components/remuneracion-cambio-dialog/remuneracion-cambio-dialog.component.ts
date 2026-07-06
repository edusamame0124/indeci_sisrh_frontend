import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { RemuneracionCambioInput } from '../../../../models/empleado-planilla.model';

/**
 * Registrar un cambio remunerativo con vigencia (F2). No sobrescribe: crea una
 * nueva vigencia. Devuelve el input al confirmar, o `null` al cancelar.
 */
@Component({
  selector: 'app-remuneracion-cambio-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Registrar cambio remunerativo</h2>
    <form [formGroup]="form" (ngSubmit)="confirmar()">
      <mat-dialog-content class="rc__content">
        <mat-form-field appearance="outline">
          <mat-label>Vigencia desde</mat-label>
          <input matInput type="date" formControlName="vigenciaDesde" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Monto base de contrato</mat-label>
          <input matInput type="number" step="0.01" min="0" formControlName="montoBase" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Remuneración total mensual</mat-label>
          <input matInput type="number" step="0.01" min="0.01" formControlName="remuneracionTotal" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de cambio</mat-label>
          <mat-select formControlName="tipoCambio">
            <mat-option value="ADENDA">Adenda</mat-option>
            <mat-option value="INCREMENTO">Incremento</mat-option>
            <mat-option value="REDUCCION">Reducción</mat-option>
            <mat-option value="RENOVACION">Renovación</mat-option>
            <mat-option value="CONTRATO_INICIAL">Contrato inicial</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Documento de sustento</mat-label>
          <input matInput maxlength="200" formControlName="documentoSustento"
                 placeholder="Adenda / resolución / memorando" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Observación (opcional)</mat-label>
          <textarea matInput rows="2" maxlength="500" formControlName="observacion"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancelar()">Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          Registrar cambio
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .rc__content { display: flex; flex-direction: column; gap: 4px; min-width: 420px; }
    .rc__content mat-form-field { width: 100%; }
    @media (max-width: 560px) { .rc__content { min-width: unset; } }
  `,
})
export class RemuneracionCambioDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<RemuneracionCambioDialogComponent, RemuneracionCambioInput | null>>(MatDialogRef);

  readonly form = this.fb.nonNullable.group({
    vigenciaDesde: this.fb.control<string | null>(null, [Validators.required]),
    montoBase: this.fb.control<number | null>(null),
    remuneracionTotal: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipoCambio: this.fb.control<string>('ADENDA'),
    documentoSustento: this.fb.control<string>(''),
    observacion: this.fb.control<string>(''),
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      vigenciaDesde: v.vigenciaDesde!,
      montoBase: v.montoBase ?? null,
      remuneracionTotal: v.remuneracionTotal!,
      tipoCambio: v.tipoCambio || null,
      documentoSustento: v.documentoSustento?.trim() || null,
      observacion: v.observacion?.trim() || null,
    });
  }
}
