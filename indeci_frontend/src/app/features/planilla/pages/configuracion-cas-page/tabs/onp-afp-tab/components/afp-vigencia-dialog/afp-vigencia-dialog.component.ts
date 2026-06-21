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
  AfpCatalogRow,
  AfpParametroInput,
  AfpParametroRow,
} from '../../../../../../models/parametro-previsional.model';

export type AfpDialogModo = 'crear' | 'editar' | 'ver';

export interface AfpDialogData {
  modo: AfpDialogModo;
  row?: AfpParametroRow;
  catalog: readonly AfpCatalogRow[];
}

function generarPeriodos(): string[] {
  const periodos: string[] = [];
  const anioFin = new Date().getFullYear() + 2;
  for (let a = anioFin; a >= 1990; a--) {
    for (let m = 12; m >= 1; m--) {
      periodos.push(`${a}${String(m).padStart(2, '0')}`);
    }
  }
  return periodos;
}

function formatPeriodo(p: string): string {
  return `${p.slice(0, 4)}-${p.slice(4, 6)}`;
}

@Component({
  selector: 'app-afp-vigencia-dialog',
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
  templateUrl: './afp-vigencia-dialog.component.html',
  styleUrl: './afp-vigencia-dialog.component.css',
})
export class AfpVigenciaDialogComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(ParametroPrevisionalApiService);
  private readonly dialogRef = inject(MatDialogRef<AfpVigenciaDialogComponent>);
  readonly data              = inject<AfpDialogData>(MAT_DIALOG_DATA);

  readonly saving      = signal(false);
  readonly errorMsg    = signal<string | null>(null);
  readonly periodos    = generarPeriodos();
  readonly formatLabel = formatPeriodo;

  readonly form = this.fb.group({
    afpId:                       [null as number | null, [Validators.required]],
    periodoInicio:               [null as string | null, [Validators.required]],
    periodoFin:                  [null as string | null],
    aporteObligatorioPct:        [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    comisionFlujoPct:            [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    comisionSaldoAnualPct:       [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    primaSeguroPct:              [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    remuneracionMaximaAsegurable:[null as number | null, [Validators.required, Validators.min(0.01)]],
    fuenteOficial:               ['', [Validators.required]],
    observacion:                 [null as string | null],
  });

  get readonly()    { return this.data.modo === 'ver'; }
  get titulo()      { return { crear: 'Nueva vigencia AFP', editar: 'Editar vigencia AFP', ver: 'Detalle vigencia AFP' }[this.data.modo]; }
  get iconoTitulo() { return { crear: 'add_circle', editar: 'edit', ver: 'visibility' }[this.data.modo]; }

  ngOnInit(): void {
    const r = this.data.row;
    if (r) {
      this.form.patchValue({
        afpId:                       r.afpId,
        periodoInicio:               r.periodoInicio,
        periodoFin:                  r.periodoFin,
        aporteObligatorioPct:        r.aporteObligatorioPct,
        comisionFlujoPct:            r.comisionFlujoPct,
        comisionSaldoAnualPct:       r.comisionSaldoAnualPct,
        primaSeguroPct:              r.primaSeguroPct,
        remuneracionMaximaAsegurable:r.remuneracionMaximaAsegurable,
        fuenteOficial:               r.fuenteOficial,
        observacion:                 r.observacion,
      });
    }
    if (this.readonly) this.form.disable();
  }

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const body: AfpParametroInput = {
      afpId:                       v.afpId!,
      periodoInicio:               v.periodoInicio!,
      periodoFin:                  v.periodoFin || null,
      aporteObligatorioPct:        Number(v.aporteObligatorioPct),
      comisionFlujoPct:            Number(v.comisionFlujoPct),
      comisionSaldoAnualPct:       Number(v.comisionSaldoAnualPct),
      primaSeguroPct:              Number(v.primaSeguroPct),
      remuneracionMaximaAsegurable:Number(v.remuneracionMaximaAsegurable),
      fuenteOficial:               v.fuenteOficial!,
      urlFuenteOficial:            null,
      fechaPublicacion:            null,
      observacion:                 v.observacion || null,
    };
    this.saving.set(true);
    this.errorMsg.set(null);
    const obs$ = this.data.modo === 'crear'
      ? this.api.crearAfpParametro(body)
      : this.api.editarAfpParametro(this.data.row!.id, body);
    obs$.subscribe({
      next: () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar. Verifique los datos e intente nuevamente.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
