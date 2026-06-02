import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import type { CatSuspensionRow, SuspensionRow, SuspensionInput } from '../../models/suspension.model';

export interface SuspensionDialogData {
  catalogo: readonly CatSuspensionRow[];
  empleadoId: number;
  row?: SuspensionRow;
}

@Component({
  selector: 'app-suspension-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.row ? 'Editar' : 'Nueva' }} suspensión / licencia</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <mat-form-field appearance="outline" class="field-full">
          <mat-label>Tipo de suspensión</mat-label>
          <mat-select formControlName="codSuspension">
            @for (c of data.catalogo; track c.codSuspension) {
              <mat-option [value]="c.codSuspension">
                {{ c.codSuspension }} — {{ c.descripcion }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Fecha inicio</mat-label>
            <input matInput [matDatepicker]="dpI" formControlName="fechaInicio"
                   (dateChange)="recalcularDias()" />
            <mat-datepicker-toggle matIconSuffix [for]="dpI" />
            <mat-datepicker #dpI />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha fin</mat-label>
            <input matInput [matDatepicker]="dpF" formControlName="fechaFin"
                   (dateChange)="recalcularDias()" />
            <mat-datepicker-toggle matIconSuffix [for]="dpF" />
            <mat-datepicker #dpF />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="field-full">
          <mat-label>Días afectos</mat-label>
          <input matInput type="number" min="1" formControlName="diasAfectos" />
          <mat-hint>Se calcula automáticamente por rango de fechas.</mat-hint>
        </mat-form-field>

        @if (catSeleccionada()?.requiereCmp === 'S') {
          <mat-form-field appearance="outline" class="field-full">
            <mat-label>Nro. CMP</mat-label>
            <input matInput formControlName="nroCmp" />
          </mat-form-field>
        }

        @if (catSeleccionada()?.requiereResolucion === 'S') {
          <mat-form-field appearance="outline" class="field-full">
            <mat-label>Nro. Resolución</mat-label>
            <input matInput formControlName="nroResolucion" />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="field-full">
          <mat-label>Observación</mat-label>
          <textarea matInput formControlName="observacion" rows="2"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; min-width: 400px; }
    .field-full { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `],
})
export class SuspensionFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SuspensionFormDialogComponent>);
  readonly data      = inject<SuspensionDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    codSuspension:  [this.data.row?.codSuspension ?? '', Validators.required],
    fechaInicio:    [this.data.row?.fechaInicio   ?? '', Validators.required],
    fechaFin:       [this.data.row?.fechaFin      ?? '', Validators.required],
    diasAfectos:    [this.data.row?.diasAfectos   ?? 1,  [Validators.required, Validators.min(1)]],
    nroCmp:         [this.data.row?.nroCmp        ?? ''],
    nroResolucion:  [this.data.row?.nroResolucion ?? ''],
    observacion:    [this.data.row?.observacion   ?? ''],
  });

  catSeleccionada(): CatSuspensionRow | undefined {
    const cod = this.form.controls.codSuspension.value;
    return this.data.catalogo.find(c => c.codSuspension === cod);
  }

  recalcularDias(): void {
    const ini = this.form.controls.fechaInicio.value;
    const fin = this.form.controls.fechaFin.value;
    if (!ini || !fin) return;
    const dIni = new Date(ini);
    const dFin = new Date(fin);
    const dias = Math.max(1, Math.round((dFin.getTime() - dIni.getTime()) / 86_400_000) + 1);
    this.form.controls.diasAfectos.setValue(dias);
  }

  confirmar(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const input: SuspensionInput = {
      empleadoId:    this.data.empleadoId,
      codSuspension: v.codSuspension!,
      fechaInicio:   this.toIso(v.fechaInicio),
      fechaFin:      this.toIso(v.fechaFin),
      diasAfectos:   v.diasAfectos ?? 1,
      nroCmp:        v.nroCmp      || null,
      nroResolucion: v.nroResolucion || null,
      observacion:   v.observacion  || null,
    };
    this.dialogRef.close(input);
  }

  private toIso(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    const d = new Date(value as string);
    return d.toISOString().split('T')[0];
  }
}
