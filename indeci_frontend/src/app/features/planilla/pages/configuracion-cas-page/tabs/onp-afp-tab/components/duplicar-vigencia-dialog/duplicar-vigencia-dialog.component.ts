import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { type Observable } from 'rxjs';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import type { AfpParametroRow, OnpParametroRow } from '../../../../../../models/parametro-previsional.model';

export type DuplicarTipo = 'AFP' | 'ONP';

export interface DuplicarVigenciaDialogData {
  tipo: DuplicarTipo;
  row: AfpParametroRow | OnpParametroRow;
}

const PERIODO_RE = /^[0-9]{4}(0[1-9]|1[0-2])$/;

@Component({
  selector: 'app-duplicar-vigencia-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './duplicar-vigencia-dialog.component.html',
  styleUrl: './duplicar-vigencia-dialog.component.css',
})
export class DuplicarVigenciaDialogComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(ParametroPrevisionalApiService);
  private readonly dialogRef = inject(MatDialogRef<DuplicarVigenciaDialogComponent>);
  readonly data              = inject<DuplicarVigenciaDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    periodoInicio: ['', [Validators.required, Validators.pattern(PERIODO_RE)]],
    fuenteOficial: ['', [Validators.required, Validators.maxLength(200)]],
    observacion:   ['', [Validators.required, Validators.maxLength(400)]],
  });

  get isAfp(): boolean            { return this.data.tipo === 'AFP'; }
  get afpRow(): AfpParametroRow   { return this.data.row as AfpParametroRow; }
  get onpRow(): OnpParametroRow   { return this.data.row as OnpParametroRow; }

  ngOnInit(): void {
    this.form.patchValue({
      periodoInicio: this.sugerirSiguientePeriodo(this.data.row.periodoInicio),
      fuenteOficial: this.data.row.fuenteOficial,
    });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set(null);

    const body = {
      periodoInicio: this.form.value.periodoInicio!,
      fuenteOficial: this.form.value.fuenteOficial!,
      observacion:   this.form.value.observacion!,
    };

    const call$: Observable<unknown> = this.isAfp
      ? this.api.duplicarAfpVigencia(this.data.row.id, body)
      : this.api.duplicarOnpVigencia(this.data.row.id, body);

    call$.subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.errorMsg.set(
          err?.error?.message ??
          'Error al duplicar la vigencia. Verifique los datos e intente nuevamente.'
        );
      },
    });
  }

  private sugerirSiguientePeriodo(periodo: string): string {
    if (!PERIODO_RE.test(periodo)) return '';
    const year  = parseInt(periodo.slice(0, 4), 10);
    const month = parseInt(periodo.slice(4, 6), 10);
    return month === 12
      ? `${year + 1}01`
      : `${year}${String(month + 1).padStart(2, '0')}`;
  }
}
