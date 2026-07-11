import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PadronVacacionalRowDto } from '../../models/padron-vacacional.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-goce-directo-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Registro Directo de Goce (Override)</h2>
    <mat-dialog-content>
      <div class="empleado-info" style="margin-bottom: 1rem;">
        <strong>{{ data.nombreCompleto }}</strong> ({{ data.dni }})
      </div>
      <form [formGroup]="form">
        <div style="display: flex; gap: 1rem;">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fecha de Inicio</mat-label>
            <input matInput [matDatepicker]="pickerInicio" formControlName="fechaInicio">
            <mat-datepicker-toggle matIconSuffix [for]="pickerInicio"></mat-datepicker-toggle>
            <mat-datepicker #pickerInicio></mat-datepicker>
            <mat-error>La fecha inicio es obligatoria.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fecha de Fin</mat-label>
            <input matInput [matDatepicker]="pickerFin" formControlName="fechaFin">
            <mat-datepicker-toggle matIconSuffix [for]="pickerFin"></mat-datepicker-toggle>
            <mat-datepicker #pickerFin></mat-datepicker>
            <mat-error>La fecha fin es obligatoria.</mat-error>
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="esAdelanto" color="primary" style="margin-bottom: 1rem;">
          Es Adelanto Vacacional (ignorar límite de saldo)
        </mat-checkbox>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Documento Sustento</mat-label>
          <input matInput formControlName="documentoSustento" placeholder="Ej. Resolución N° 123-2026">
          <mat-error>El documento es obligatorio.</mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Motivo / Observación (Bypass Fraccionamiento)</mat-label>
          <textarea matInput formControlName="motivoExcepcion" rows="3" placeholder="Llenar solo si desea forzar un fraccionamiento > 7 días"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .empleado-info { padding: 1rem; background: #fff3e0; border-radius: 4px; color: #e65100; font-size: 0.9em; }
    .full-width { width: 100%; margin-top: 0.5rem; }
  `]
})
export class GoceDirectoDialogComponent {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<GoceDirectoDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly datePipe = inject(DatePipe);

  readonly form = this.fb.group({
    fechaInicio: [null as Date | null, Validators.required],
    fechaFin: [null as Date | null, Validators.required],
    esAdelanto: [false],
    documentoSustento: ['', Validators.required],
    motivoExcepcion: ['']
  });

  guardar(): void {
    if (this.form.valid) {
      const val = this.form.value;
      this.dialogRef.close({
        empleadoId: this.data.empleadoId,
        fechaInicio: this.datePipe.transform(val.fechaInicio, 'yyyy-MM-dd'),
        fechaFin: this.datePipe.transform(val.fechaFin, 'yyyy-MM-dd'),
        esAdelanto: val.esAdelanto,
        documentoSustento: val.documentoSustento,
        motivoExcepcion: val.motivoExcepcion
      });
    }
  }
}
