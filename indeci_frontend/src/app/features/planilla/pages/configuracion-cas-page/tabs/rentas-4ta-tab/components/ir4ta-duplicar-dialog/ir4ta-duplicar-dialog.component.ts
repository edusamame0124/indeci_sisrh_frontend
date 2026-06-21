import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import type { Ir4taConfigRow } from '../../../../../../models/ir4ta-config.model';

export interface Ir4taDuplicarDialogData {
  row: Ir4taConfigRow;
}

function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-ir4ta-duplicar-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ir4ta-duplicar-dialog.component.html',
  styleUrl: './ir4ta-duplicar-dialog.component.css',
})
export class Ir4taDuplicarDialogComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(Ir4taConfigApiService);
  private readonly dialogRef = inject(MatDialogRef<Ir4taDuplicarDialogComponent>);
  readonly data              = inject<Ir4taDuplicarDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly minDate = new Date(2000, 0, 1);
  readonly maxDate = new Date(2100, 11, 31);

  readonly form = this.fb.group({
    anioFiscal:    [null as number | null, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    vigenciaInicio:[null as Date | null, [Validators.required]],
    vigenciaFin:   [null as Date | null],
    uitVigente:    [null as number | null, [Validators.required, Validators.min(0.01)]],
    fuenteOficial: ['', [Validators.required, Validators.maxLength(500)]],
    observacion:   [null as string | null, [Validators.maxLength(200)]],
  });

  ngOnInit(): void {
    const origen = this.data.row;
    this.form.patchValue({
      anioFiscal:    origen.anioFiscal + 1,
      uitVigente:    origen.uitVigente,
      fuenteOficial: origen.fuenteOficial,
    });
  }

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const iniDate = v.vigenciaInicio as Date | null;
    const finDate = v.vigenciaFin   as Date | null;

    if (finDate && iniDate && finDate <= iniDate) {
      this.errorMsg.set('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);
    this.api.duplicar(this.data.row.id, {
      anioFiscal:    v.anioFiscal!,
      vigenciaInicio: toIsoDate(iniDate)!,
      vigenciaFin:   toIsoDate(finDate),
      uitVigente:    Number(v.uitVigente),
      fuenteOficial: v.fuenteOficial!,
      observacion:   v.observacion || null,
    }).subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al duplicar. Verifique los datos e intente nuevamente.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
