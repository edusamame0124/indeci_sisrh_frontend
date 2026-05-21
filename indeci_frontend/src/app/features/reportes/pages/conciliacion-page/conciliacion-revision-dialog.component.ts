import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

/** Datos de entrada del diálogo de revisión de conciliación. */
export interface ConciliacionRevisionDialogData {
  readonly nombre: string;
  readonly diferencia: number;
}

/** Resultado del diálogo (undefined si se cancela). */
export interface ConciliacionRevisionResult {
  readonly estado: string;
  readonly justificacion: string;
}

/**
 * Diálogo de revisión de una conciliación AIRHSP (SPEC §12.2 PANTALLA-06).
 * Permite justificar (JUSTIFICADO) o rechazar (RECHAZADO) la discrepancia;
 * ambos exigen un texto de justificación.
 */
@Component({
  selector: 'app-conciliacion-revision-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Revisar conciliación</h2>
    <mat-dialog-content>
      <p class="dlg-emp">
        {{ data.nombre }} — diferencia
        <strong>S/ {{ data.diferencia.toFixed(2) }}</strong>
      </p>

      <mat-form-field appearance="outline" class="dlg-field">
        <mat-label>Resultado de la revisión</mat-label>
        <mat-select [(ngModel)]="estado">
          <mat-option value="JUSTIFICADO">Justificado (diferencia aceptada)</mat-option>
          <mat-option value="RECHAZADO">Rechazado (corregir antes de avanzar)</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="dlg-field">
        <mat-label>Justificación</mat-label>
        <textarea
          matInput
          rows="3"
          [ngModel]="justificacion()"
          (ngModelChange)="justificacion.set($event)"
          maxlength="500"
          placeholder="Motivo de la diferencia con AIRHSP…"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button (click)="onCancel()">Cancelar</button>
      <button
        type="button"
        mat-flat-button
        color="primary"
        [disabled]="justificacion().trim().length === 0"
        (click)="onConfirm()"
      >
        Guardar revisión
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 360px;
        max-width: 480px;
      }
      .dlg-emp {
        margin: 0 0 1rem;
        color: #475569;
      }
      .dlg-field {
        width: 100%;
      }
    `,
  ],
})
export class ConciliacionRevisionDialogComponent {
  estado = 'JUSTIFICADO';
  readonly justificacion = signal('');

  constructor(
    private readonly dialogRef: MatDialogRef<
      ConciliacionRevisionDialogComponent,
      ConciliacionRevisionResult
    >,
    @Inject(MAT_DIALOG_DATA) readonly data: ConciliacionRevisionDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onConfirm(): void {
    const justificacion = this.justificacion().trim();
    if (justificacion.length === 0) return;
    this.dialogRef.close({ estado: this.estado, justificacion });
  }
}
