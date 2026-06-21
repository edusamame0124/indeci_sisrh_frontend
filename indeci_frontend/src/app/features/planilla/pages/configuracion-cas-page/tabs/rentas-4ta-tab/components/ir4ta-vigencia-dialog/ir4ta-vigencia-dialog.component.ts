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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import type { Ir4taConfigInput, Ir4taConfigRow } from '../../../../../../models/ir4ta-config.model';

export type Ir4taDialogModo = 'crear' | 'editar' | 'ver';

export interface Ir4taVigenciaDialogData {
  modo: Ir4taDialogModo;
  row?: Ir4taConfigRow;
}

/** Convierte "YYYY-MM-DD" a Date para el datepicker. */
function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Convierte Date del datepicker a "YYYY-MM-DD" para el backend. */
function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-ir4ta-vigencia-dialog',
  standalone: true,
  imports: [
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
  templateUrl: './ir4ta-vigencia-dialog.component.html',
  styleUrl: './ir4ta-vigencia-dialog.component.css',
})
export class Ir4taVigenciaDialogComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(Ir4taConfigApiService);
  private readonly dialogRef = inject(MatDialogRef<Ir4taVigenciaDialogComponent>);
  readonly data              = inject<Ir4taVigenciaDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly anoActual = new Date().getFullYear();
  readonly minDate   = new Date(2000, 0, 1);
  readonly maxDate   = new Date(2100, 11, 31);

  readonly form = this.fb.group({
    anioFiscal:        [null as number | null, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    vigenciaInicio:    [null as Date | null, [Validators.required]],
    vigenciaFin:       [null as Date | null],
    uitVigente:        [null as number | null, [Validators.required, Validators.min(0.01)]],
    tasaIr4ta:         [8 as number | null, [Validators.min(0.01), Validators.max(100)]],
    baseInafectaIr4ta: [null as number | null, [Validators.min(0)]],
    fuenteOficial:     ['', [Validators.required, Validators.maxLength(500)]],
    observacion:       [null as string | null, [Validators.maxLength(200)]],
  });

  get readonly()    { return this.data.modo === 'ver'; }
  get titulo()      { return { crear: 'Nueva vigencia 4ta categoría', editar: 'Editar vigencia 4ta categoría', ver: 'Detalle vigencia 4ta categoría' }[this.data.modo]; }
  get iconoTitulo() { return { crear: 'add_circle', editar: 'edit', ver: 'visibility' }[this.data.modo]; }

  ngOnInit(): void {
    const r = this.data.row;
    if (r) {
      this.form.patchValue({
        anioFiscal:        r.anioFiscal,
        vigenciaInicio:    parseIsoDate(r.vigenciaInicio),
        vigenciaFin:       parseIsoDate(r.vigenciaFin),
        uitVigente:        r.uitVigente,
        tasaIr4ta:         r.tasaIr4ta,
        baseInafectaIr4ta: r.baseInafectaIr4ta ?? null,
        fuenteOficial:     r.fuenteOficial,
        observacion:       r.observacion ?? null,
      });
    }
    if (this.readonly) this.form.disable();
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

    const body: Ir4taConfigInput = {
      anioFiscal:        v.anioFiscal!,
      vigenciaInicio:    toIsoDate(iniDate)!,
      vigenciaFin:       toIsoDate(finDate),
      uitVigente:        Number(v.uitVigente),
      tasaIr4ta:         v.tasaIr4ta != null ? Number(v.tasaIr4ta) : null,
      baseInafectaIr4ta: v.baseInafectaIr4ta != null ? Number(v.baseInafectaIr4ta) : null,
      fuenteOficial:     v.fuenteOficial!,
      urlFuenteOficial:  null,
      fechaPublicacion:  null,
      observacion:       v.observacion || null,
    };

    this.saving.set(true);
    this.errorMsg.set(null);
    const obs$ = this.data.modo === 'crear'
      ? this.api.crear(body)
      : this.api.editar(this.data.row!.id, body);

    obs$.subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar. Verifique los datos e intente nuevamente.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
