import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmpleadoSaludEpsApiService } from '../../../../services/empleado-salud-eps-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import type {
  EmpleadoSaludEpsInput,
  EmpleadoSaludEpsRow,
  EpsItem,
  TipoCobertura,
} from '../../../../models/empleado-salud-eps.model';

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fechaInicio')?.value as Date | null;
  const fin    = group.get('fechaFin')?.value as Date | null;
  if (inicio && fin && fin < inicio) {
    return { fechaFinMenor: true };
  }
  return null;
}

@Component({
  selector: 'app-salud-eps-actual-tab',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule,
    MatRadioModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salud-eps-actual-tab.component.html',
  styleUrl: './salud-eps-actual-tab.component.css',
})
export class SaludEpsActualTabComponent implements OnChanges {
  @Input({ required: true }) empleadoId!: number;
  @Input() actual: EmpleadoSaludEpsRow | null = null;
  @Input() epsList: readonly EpsItem[] = [];
  @Output() guardado = new EventEmitter<void>();

  private readonly api     = inject(EmpleadoSaludEpsApiService);
  private readonly notif   = inject(NotificacionService);
  private readonly snack   = inject(MatSnackBar);
  private readonly fb      = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);

  readonly saving    = signal(false);
  readonly submitted = signal(false);

  readonly form = this.fb.group(
    {
      tipoCobertura:     ['ESSALUD', Validators.required],
      epsId:             [null as number | null],
      fechaInicio:       [null as Date | null, Validators.required],
      fechaFin:          [null as Date | null],
      documentoSustento: [null as string | null],
      observacion:       [null as string | null],
    },
    { validators: dateRangeValidator },
  );

  readonly formVal = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  readonly esEps = computed(() => this.formVal().tipoCobertura === 'ESSALUD_EPS');

  constructor() {
    // Única suscripción — vive hasta que el componente se destruye
    this.form.get('tipoCobertura')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((tipo) => {
        this.updateEpsValidators(tipo === 'ESSALUD_EPS');
        this.submitted.set(false);
      });
  }

  ngOnChanges(): void {
    this.initForm();
  }

  guardar(): void {
    this.submitted.set(true);
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const input: EmpleadoSaludEpsInput = {
      tipoCobertura:     v.tipoCobertura as TipoCobertura,
      epsId:             this.esEps() ? (v.epsId ?? null) : null,
      fechaInicio:       this.dateToStr(v.fechaInicio)!,
      fechaFin:          this.dateToStr(v.fechaFin),
      documentoSustento: v.documentoSustento ?? null,
      observacion:       v.observacion ?? null,
    };

    const op$ = this.actual
      ? this.api.editar(this.empleadoId, this.actual.id, input)
      : this.api.crear(this.empleadoId, input);

    op$.subscribe({
      next: () => {
        this.notif.exito('Cobertura Salud/EPS guardada correctamente.');
        this.saving.set(false);
        this.submitted.set(false);
        this.guardado.emit();
      },
      error: (err: any) => {
        this.snack.open(
          err?.error?.message ?? 'Error al guardar la cobertura.',
          'Cerrar',
          { duration: 7000 },
        );
        this.saving.set(false);
      },
    });
  }

  cancelar(): void {
    this.submitted.set(false);
    this.initForm();
  }

  /** Devuelve true solo cuando el error debe mostrarse al usuario. */
  errorVisible(ctrlName: string, error: string): boolean {
    const ctrl = this.form.get(ctrlName);
    if (!ctrl) return false;
    return ctrl.hasError(error) && (ctrl.touched || ctrl.dirty || this.submitted());
  }

  /** Error a nivel de formulario (ej. rango de fechas). */
  formErrorVisible(error: string): boolean {
    const fechaFin = this.form.get('fechaFin');
    const touched  = !!(fechaFin?.touched || fechaFin?.dirty || this.submitted());
    return this.form.hasError(error) && touched;
  }

  estadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'ACTIVO':   return 'badge--activo';
      case 'CERRADO':  return 'badge--cerrado';
      case 'INACTIVO': return 'badge--inactivo';
      case 'ANULADO':  return 'badge--anulado';
      default:         return '';
    }
  }

  private initForm(): void {
    if (this.actual) {
      this.form.patchValue(
        {
          tipoCobertura:     this.actual.tipoCobertura,
          epsId:             this.actual.epsId ?? null,
          fechaInicio:       this.actual.fechaInicio
                               ? new Date(this.actual.fechaInicio + 'T00:00:00')
                               : null,
          fechaFin:          this.actual.fechaFin
                               ? new Date(this.actual.fechaFin + 'T00:00:00')
                               : null,
          documentoSustento: this.actual.documentoSustento ?? null,
          observacion:       this.actual.observacion ?? null,
        },
        { emitEvent: false },
      );
    } else {
      this.form.reset({ tipoCobertura: 'ESSALUD' }, { emitEvent: false });
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted.set(false);
    this.updateEpsValidators(this.form.getRawValue().tipoCobertura === 'ESSALUD_EPS');
  }

  private updateEpsValidators(esEps: boolean): void {
    const ctrl = this.form.get('epsId')!;
    if (esEps) {
      ctrl.setValidators([Validators.required]);
      ctrl.enable({ emitEvent: false });
    } else {
      ctrl.clearValidators();
      ctrl.setValue(null, { emitEvent: false });
      ctrl.disable({ emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private dateToStr(d: Date | null | undefined): string | null {
    if (!d) return null;
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }
}
