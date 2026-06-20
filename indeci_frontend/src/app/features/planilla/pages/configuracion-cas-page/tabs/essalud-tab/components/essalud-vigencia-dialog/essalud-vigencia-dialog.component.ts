import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { map } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EssaludApiService } from '../../../../../../services/essalud-api.service';
import type { EssaludVigenciaInput, EssaludVigenciaRow } from '../../../../../../models/essalud.model';

export type EssaludDialogModo = 'crear' | 'editar' | 'ver';

export interface EssaludVigenciaDialogData {
  modo: EssaludDialogModo;
  row?: EssaludVigenciaRow;
}

@Component({
  selector: 'app-essalud-vigencia-dialog',
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
    MatSlideToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './essalud-vigencia-dialog.component.html',
  styleUrl: './essalud-vigencia-dialog.component.css',
})
export class EssaludVigenciaDialogComponent implements OnInit {
  private readonly fb         = inject(FormBuilder);
  private readonly api        = inject(EssaludApiService);
  private readonly dialogRef  = inject(MatDialogRef<EssaludVigenciaDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);
  readonly data               = inject<EssaludVigenciaDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      vigenciaInicio:   ['', [Validators.required]],
      vigenciaFin:      [null as string | null],
      uitVigente:       [null as number | null, [Validators.required, Validators.min(0.01)]],
      pctBaseCas:       [45,   [Validators.required, Validators.min(0), Validators.max(100)]],
      pctEssalud:       [9,    [Validators.required, Validators.min(0), Validators.max(100)]],
      aplicaEps:        [true],
      pctEssaludEps:    [6.75 as number | null],
      pctCreditoEps:    [2.25 as number | null],
      fuenteOficial:    ['', [Validators.required]],
      fechaPublicacion: [null as string | null],
      observacion:      [null as string | null],
    },
    { validators: [this.epsValidator()] },
  );

  // Señal reactiva sobre el formulario — getRawValue incluye campos disabled (modo 'ver')
  readonly formVal = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  readonly epsActivo = computed(() => !!this.formVal().aplicaEps);

  readonly previewBase = computed(() => {
    const v = this.formVal();
    const uit = v.uitVigente;
    const pct = v.pctBaseCas;
    if (!uit || !pct || Number(uit) <= 0) return null;
    return Number(uit) * Number(pct) / 100;
  });

  readonly previewEssalud = computed(() => {
    const base = this.previewBase();
    const pct  = this.formVal().pctEssalud;
    if (base == null || !pct) return null;
    return base * Number(pct) / 100;
  });

  readonly previewDistribucion = computed(() => {
    if (!this.epsActivo()) return null;
    const v    = this.formVal();
    const eps  = v.pctEssaludEps;
    const cred = v.pctCreditoEps;
    const tot  = v.pctEssalud;
    if (eps == null || cred == null || tot == null) return null;
    return { total: Number(tot), eps: Number(eps), credito: Number(cred) };
  });

  get readonly()    { return this.data.modo === 'ver'; }
  get titulo() {
    return {
      crear: 'Nueva vigencia EsSalud / EPS',
      editar: 'Editar vigencia EsSalud / EPS',
      ver: 'Detalle vigencia EsSalud / EPS',
    }[this.data.modo];
  }
  get iconoTitulo() {
    return { crear: 'add_circle', editar: 'edit', ver: 'visibility' }[this.data.modo];
  }

  ngOnInit(): void {
    // Inicializar validadores EPS (por defecto activo = true)
    this.updateEpsValidators(true);

    // Actualizar validadores cuando cambia el toggle
    this.form.get('aplicaEps')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.updateEpsValidators(!!v));

    const r = this.data.row;
    if (r) {
      this.form.patchValue({
        vigenciaInicio:   r.vigenciaInicio ? r.vigenciaInicio.substring(0, 10) : '',
        vigenciaFin:      r.vigenciaFin ? r.vigenciaFin.substring(0, 10) : null,
        uitVigente:       r.uitVigente,
        pctBaseCas:       r.pctBaseCas,
        pctEssalud:       r.pctEssalud,
        aplicaEps:        r.aplicaEps ?? false,
        pctEssaludEps:    r.pctEssaludEps,
        pctCreditoEps:    r.pctCreditoEps,
        fuenteOficial:    r.fuenteOficial,
        fechaPublicacion: r.fechaPublicacion ? r.fechaPublicacion.substring(0, 10) : null,
        observacion:      r.observacion,
      });
    }

    if (this.readonly) this.form.disable();
  }

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const aplicaEps = v.aplicaEps ?? false;
    const body: EssaludVigenciaInput = {
      vigenciaInicio:   v.vigenciaInicio!,
      vigenciaFin:      v.vigenciaFin || null,
      uitVigente:       Number(v.uitVigente),
      pctBaseCas:       Number(v.pctBaseCas),
      pctEssalud:       Number(v.pctEssalud),
      aplicaEps,
      pctEssaludEps:    aplicaEps && v.pctEssaludEps != null ? Number(v.pctEssaludEps) : null,
      pctCreditoEps:    aplicaEps && v.pctCreditoEps != null ? Number(v.pctCreditoEps) : null,
      fuenteOficial:    v.fuenteOficial!,
      fechaPublicacion: v.fechaPublicacion || null,
      observacion:      v.observacion || null,
    };
    this.saving.set(true);
    this.errorMsg.set(null);
    const obs$ = this.data.modo === 'crear'
      ? this.api.crearVigencia(body)
      : this.api.editarVigencia(this.data.row!.id, body);
    obs$.subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar. Verifique los datos e intente nuevamente.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }

  private updateEpsValidators(activo: boolean): void {
    const epsCtrl  = this.form.get('pctEssaludEps');
    const credCtrl = this.form.get('pctCreditoEps');
    if (activo) {
      epsCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      credCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
    } else {
      epsCtrl?.clearValidators();
      credCtrl?.clearValidators();
    }
    epsCtrl?.updateValueAndValidity({ emitEvent: false });
    credCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  // Valida que pctEssaludEps + pctCreditoEps = pctEssalud (±0.011 tolerancia)
  private epsValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const fg = control as FormGroup;
      if (!fg.get('aplicaEps')?.value) return null;
      const total = Number(fg.get('pctEssalud')?.value ?? 0);
      const eps   = Number(fg.get('pctEssaludEps')?.value ?? 0);
      const cred  = Number(fg.get('pctCreditoEps')?.value ?? 0);
      return Math.abs(eps + cred - total) > 0.011 ? { epsDistribucionInvalida: true } : null;
    };
  }
}
