import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import type {
  OnpParametroInput,
  OnpParametroRow,
} from '../../../../../../models/parametro-previsional.model';

export type OnpDialogModo = 'crear' | 'editar' | 'ver';

export interface OnpDialogData {
  modo: OnpDialogModo;
  row?: OnpParametroRow;
}

/** Genera períodos en formato "YYYYMM" desde anioFin/12 hasta 1990/01, descendente. */
function generarPeriodos(): string[] {
  const periodos: string[] = [];
  const hoy    = new Date();
  const anioFin = hoy.getFullYear() + 2;
  for (let a = anioFin; a >= 1990; a--) {
    for (let m = 12; m >= 1; m--) {
      periodos.push(`${a}${String(m).padStart(2, '0')}`);
    }
  }
  return periodos;
}

/** "202601" → "2026-01" para display */
function formatPeriodo(p: string): string {
  return `${p.slice(0, 4)}-${p.slice(4, 6)}`;
}

@Component({
  selector: 'app-onp-vigencia-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onp-vigencia-dialog.component.html',
  styleUrl: './onp-vigencia-dialog.component.css',
})
export class OnpVigenciaDialogComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(ParametroPrevisionalApiService);
  private readonly dialogRef = inject(MatDialogRef<OnpVigenciaDialogComponent>);
  readonly data              = inject<OnpDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly periodos    = generarPeriodos();
  readonly formatLabel = formatPeriodo;

  readonly form = this.fb.group({
    periodoInicio: [null as string | null, [Validators.required]],
    periodoFin:    [null as string | null],
    aporteOnpPct:  [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    fuenteOficial: [''  , [Validators.required]],
    observacion:   [null as string | null],
  });

  get readonly()    { return this.data.modo === 'ver'; }
  get titulo()      { return { crear: 'Nueva vigencia ONP', editar: 'Editar vigencia ONP', ver: 'Detalle vigencia ONP' }[this.data.modo]; }
  get iconoTitulo() { return { crear: 'add_circle', editar: 'edit', ver: 'visibility' }[this.data.modo]; }

  ngOnInit(): void {
    const r = this.data.row;
    if (r) {
      this.form.patchValue({
        periodoInicio: r.periodoInicio ?? null,
        periodoFin:    r.periodoFin   ?? null,
        aporteOnpPct:  r.aporteOnpPct,
        fuenteOficial: r.fuenteOficial,
        observacion:   r.observacion,
      });
    }
    if (this.readonly) this.form.disable();
  }

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const body: OnpParametroInput = {
      periodoInicio:    v.periodoInicio!,
      periodoFin:       v.periodoFin || null,
      aporteOnpPct:     Number(v.aporteOnpPct),
      fuenteOficial:    v.fuenteOficial!,
      urlFuenteOficial: null,
      fechaPublicacion: null,
      observacion:      v.observacion || null,
    };
    this.saving.set(true);
    this.errorMsg.set(null);
    const obs$ = this.data.modo === 'crear'
      ? this.api.crearOnpParametro(body)
      : this.api.editarOnpParametro(this.data.row!.id, body);
    obs$.subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar. Verifique los datos e intente nuevamente.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
