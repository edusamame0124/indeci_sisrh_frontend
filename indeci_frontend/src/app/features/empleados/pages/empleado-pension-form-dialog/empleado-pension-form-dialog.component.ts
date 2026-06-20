import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EmpleadoPensionApiService } from '../../services/empleado-pension-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type {
  RegimenPensionarioCatalogItem,
  TipoComisionAfpCatalogItem,
} from '../../models/catalog-item.model';
import type {
  CondicionEspecialAfp,
  EmpleadoPensionInput,
  TasasVigentesPension,
} from '../../models/empleado-pension.model';

export interface EmpleadoPensionFormDialogData {
  empleadoId: number;
  personaLabel: string;
}

const CUSPP_PATTERN = /^[A-Z0-9]{12}$/;
const CUSPP_INVALID_CHARS = /[^A-Z0-9]/g;

function toPercent(fraction: number | null): number | null {
  if (fraction == null) return null;
  return Math.round(fraction * 10000) / 100;
}

function sustentoCrossValidator(ctrl: AbstractControl): ValidationErrors | null {
  const condicion = ctrl.get('condicionEspecialAfp')?.value as string | null;
  const observacion = ctrl.get('observacionCondicionAfp')?.value as string | null;
  if ((condicion === 'RETIRO_955' || condicion === 'PENSIONISTA_SPP') && !observacion?.trim()) {
    return { sustentoRequerido: true };
  }
  return null;
}

@Component({
  selector: 'app-empleado-pension-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './empleado-pension-form-dialog.component.html',
  styleUrl: './empleado-pension-form-dialog.component.css',
})
export class EmpleadoPensionFormDialogComponent implements OnInit {
  private readonly pensionApi = inject(EmpleadoPensionApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly snack      = inject(MatSnackBar);
  private readonly notif      = inject(NotificacionService);
  private readonly errors     = inject(ErrorMessageService);
  private readonly fb         = inject(FormBuilder);

  readonly regimenes    = signal<readonly RegimenPensionarioCatalogItem[]>([]);
  readonly tiposComision = signal<readonly TipoComisionAfpCatalogItem[]>([]);
  readonly pageLoading  = signal(true);
  readonly guardando    = signal(false);
  readonly tasasVigentes  = signal<TasasVigentesPension | null>(null);
  readonly tasasLoading   = signal(false);
  readonly tasasError     = signal(false);
  readonly personalizarTasas = signal(false);
  readonly tipoRegimenSeleccionado = signal<string | null>(null);

  readonly esAfp  = computed(() => this.tipoRegimenSeleccionado() === 'AFP');
  readonly esOnp  = computed(() => this.tipoRegimenSeleccionado() === 'ONP');
  readonly mostrarCondicionAfp = computed(() => this.esAfp());
  readonly condicionRequiereSustento = computed(() => {
    const c = this.form.controls.condicionEspecialAfp.value;
    return c === 'RETIRO_955' || c === 'PENSIONISTA_SPP';
  });

  readonly form = this.fb.group(
    {
      regimenPensionarioId: this.fb.control<number | null>(null, Validators.required),
      cuspp:                this.fb.nonNullable.control<string>(''),
      tipoComisionAfpId:    this.fb.control<number | null>(null),
      porcentajeAporte:     this.fb.control<number | null>(null),
      porcentajeComision:   this.fb.control<number | null>(null),
      porcentajeSeguro:     this.fb.control<number | null>(null),
      condicionEspecialAfp: this.fb.nonNullable.control<CondicionEspecialAfp>('NO_APLICA'),
      fechaCondicionAfp:    this.fb.control<Date | null>(null),
      observacionCondicionAfp: this.fb.control<string | null>(null),
    },
    { validators: sustentoCrossValidator },
  );

  constructor(
    public readonly dialogRef: MatDialogRef<EmpleadoPensionFormDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EmpleadoPensionFormDialogData,
  ) {
    this.form.controls.regimenPensionarioId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.onRegimenChange(id));

    this.form.controls.tipoComisionAfpId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => { if (this.esAfp()) this.fetchTasas(); });

    this.form.controls.condicionEspecialAfp.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.updateValueAndValidity());
  }

  ngOnInit(): void {
    forkJoin({
      regimenes:     this.catalogoApi.listarRegimenesPensionarios(),
      tiposComision: this.catalogoApi.listarTiposComisionAfp(),
    }).subscribe({
      next: ({ regimenes, tiposComision }) => {
        this.regimenes.set(regimenes);
        this.tiposComision.set(tiposComision);
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.pageLoading.set(false);
        this.snack.open(this.translateError(err), 'Cerrar', { duration: 6000 });
        this.dialogRef.close(false);
      },
    });
  }

  private onRegimenChange(id: number | null): void {
    const regimen = id != null ? this.regimenes().find((r) => r.id === id) : undefined;
    const tipo    = regimen?.tipo?.trim().toUpperCase() ?? null;
    this.tipoRegimenSeleccionado.set(tipo);

    const cusppCtrl      = this.form.controls.cuspp;
    const tipoComisionCtrl = this.form.controls.tipoComisionAfpId;
    const pctCtrls = [
      this.form.controls.porcentajeAporte,
      this.form.controls.porcentajeComision,
      this.form.controls.porcentajeSeguro,
    ];

    if (tipo === 'AFP') {
      cusppCtrl.setValidators([Validators.required, Validators.pattern(CUSPP_PATTERN)]);
      tipoComisionCtrl.setValidators([Validators.required, Validators.min(1)]);
      this.personalizarTasas.set(false);
      for (const c of pctCtrls) c.disable({ emitEvent: false });
      this.form.controls.condicionEspecialAfp.setValue('NO_APLICA', { emitEvent: false });
      this.fetchTasas();
    } else {
      cusppCtrl.clearValidators();
      tipoComisionCtrl.clearValidators();
      tipoComisionCtrl.setValue(null, { emitEvent: false });
      for (const c of pctCtrls) { c.setValue(null, { emitEvent: false }); c.disable({ emitEvent: false }); }
      this.tasasVigentes.set(null);
      this.tasasError.set(false);
    }
    cusppCtrl.updateValueAndValidity({ emitEvent: false });
    tipoComisionCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private fetchTasas(opts: { skipFormPatch?: boolean } = {}): void {
    const regimenId = this.form.controls.regimenPensionarioId.value;
    if (regimenId == null) { this.tasasVigentes.set(null); return; }
    const tipoId = this.esAfp() ? this.form.controls.tipoComisionAfpId.value : null;
    this.tasasLoading.set(true);
    this.tasasError.set(false);
    this.pensionApi.obtenerTasasVigentes(regimenId, tipoId).subscribe({
      next: (t) => {
        this.tasasVigentes.set(t);
        this.tasasLoading.set(false);
        if (!opts.skipFormPatch && !this.personalizarTasas()) {
          this.form.patchValue(
            { porcentajeAporte: toPercent(t.aporte), porcentajeComision: toPercent(t.comision), porcentajeSeguro: toPercent(t.prima) },
            { emitEvent: false },
          );
        }
      },
      error: () => { this.tasasLoading.set(false); this.tasasError.set(true); },
    });
  }

  togglePersonalizar(): void {
    const next = !this.personalizarTasas();
    this.personalizarTasas.set(next);
    const pctCtrls = [
      this.form.controls.porcentajeAporte,
      this.form.controls.porcentajeComision,
      this.form.controls.porcentajeSeguro,
    ];
    if (next) {
      for (const c of pctCtrls) c.enable({ emitEvent: false });
    } else {
      for (const c of pctCtrls) c.disable({ emitEvent: false });
      const t = this.tasasVigentes();
      if (t) {
        this.form.patchValue(
          { porcentajeAporte: toPercent(t.aporte), porcentajeComision: toPercent(t.comision), porcentajeSeguro: toPercent(t.prima) },
          { emitEvent: false },
        );
      }
    }
  }

  onCusppInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const cleaned = input.value.toUpperCase().replace(CUSPP_INVALID_CHARS, '').slice(0, 12);
    if (input.value !== cleaned) this.form.controls.cuspp.setValue(cleaned);
  }

  guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v          = this.form.getRawValue();
    const regimenId  = v.regimenPensionarioId;
    if (regimenId == null) return;

    const regimen    = this.regimenes().find((r) => r.id === regimenId);
    const tipoRegimen = regimen?.tipo?.trim().toUpperCase() ?? '';
    const esAfp      = tipoRegimen === 'AFP';

    const fechaRaw   = v.fechaCondicionAfp;
    const fechaIso   = fechaRaw instanceof Date
      ? fechaRaw.toISOString().slice(0, 10)
      : null;

    const body: EmpleadoPensionInput = {
      empleadoId:           this.data.empleadoId,
      regimenPensionarioId: regimenId,
      cuspp:                v.cuspp.trim(),
      porcentajeAporte:     v.porcentajeAporte,
      porcentajeComision:   v.porcentajeComision,
      porcentajeSeguro:     v.porcentajeSeguro,
      tipoComisionAfpId:    esAfp ? v.tipoComisionAfpId : null,
      tipoRegimen,
      condicionEspecialAfp: esAfp ? v.condicionEspecialAfp : null,
      fechaCondicionAfp:    esAfp ? fechaIso : null,
      documentoSustentoId:  null,
      observacionCondicionAfp: esAfp ? (v.observacionCondicionAfp?.trim() || null) : null,
    };

    this.guardando.set(true);
    this.pensionApi.guardar(body).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notif.exito('Pensión registrada correctamente.');
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.snack.open(this.translateError(err), 'Cerrar', { duration: 7000 });
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private translateError(err: HttpErrorResponse): string {
    const body = err.error;
    return isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
  }
}
