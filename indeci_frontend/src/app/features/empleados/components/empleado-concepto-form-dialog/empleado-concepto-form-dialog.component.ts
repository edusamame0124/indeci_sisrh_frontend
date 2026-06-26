import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, combineLatest } from 'rxjs';
import { catchError, debounceTime, startWith, switchMap } from 'rxjs/operators';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type { ConceptoPlanillaRow } from '../../../planilla/models/concepto-planilla.model';
import { EmpleadoConceptoApiService } from '../../services/empleado-concepto-api.service';
import type { EmpleadoConceptoInput, EmpleadoConceptoRow } from '../../models/empleado-concepto.model';
import { EstimacionNetoApiService } from '../../services/estimacion-neto-api.service';
import type { EstimacionNetoResult } from '../../models/estimacion-neto.model';

export interface EmpleadoConceptoFormDialogData {
  readonly empleadoId: number;
  readonly title: string;
  readonly submitLabel: string;
  /** Registro existente — modo edición (Spec 009 / T140). */
  readonly registro?: EmpleadoConceptoRow;
  /** Oculta conceptos ya asignados al colaborador (evita duplicados en alta). */
  readonly conceptosYaAsignadosIds?: ReadonlySet<number>;
}

/** Grupo del dropdown de conceptos (mat-optgroup). */
export interface ConceptoOptGroup {
  readonly label: string;
  readonly items: readonly ConceptoPlanillaRow[];
}

/** SISPER del Aporte Facultativo 0.5% — único concepto que se ingresa por %. */
const SISPER_APORTE_FACULTATIVO = '613';

/** 14 descuentos voluntarios SISPER (SPEC §4 M07). */
const SISPER_VOLUNTARIOS: ReadonlySet<string> = new Set([
  '735', '722', '734', '703', '715', '727',
  '726', '704', '725', '717', '613', '731', '736', '737',
]);

/** Ajustes especiales: judicial (716), diferencial (059/060), reintegro (041). */
const SISPER_AJUSTES: ReadonlySet<string> = new Set(['716', '059', '060', '041']);

/**
 * CODIGO_MEF que el motor de planilla calcula automáticamente. Estos conceptos
 * NO se asignan a mano: el backend los rechaza con HTTP 422. Espeja
 * `EmpleadoConceptoService.MEF_AUTOCALCULADOS` (Spec 013 / C1).
 */
const MEF_AUTOCALCULADOS: ReadonlySet<string> = new Set([
  '00302', '00502', '05001', '05002', '05003', '05004',
  '05101', '06001', '06002', '05309', '05401', '05402',
]);

/**
 * Conceptos de remuneración base (mejora 2026-06-03): el motor los calcula desde
 * el sueldo básico de Configuración de planilla → NO se asignan a mano. El backend
 * ya los excluye de `asignables`; esto es defensa en profundidad en el front.
 * CAS=00501, 728=00301, 276=00102(+00101 legacy); SERVIR L001–L004 (RD0111).
 */
const MEF_BASE_REMUNERATIVA: ReadonlySet<string> = new Set([
  '00101', '00102', '00301', '00501', 'L001', 'L002', 'L003', 'L004',
]);

/** Un concepto lo calcula el motor → no debe ofrecerse para asignación manual. */
function esCalculadoPorMotor(c: ConceptoPlanillaRow): boolean {
  if (c.tipoConcepto === 'APORTE_TRABAJADOR' || c.tipoConcepto === 'APORTE_EMPLEADOR') {
    return true;
  }
  return (
    c.codigoMef != null &&
    (MEF_AUTOCALCULADOS.has(c.codigoMef) || MEF_BASE_REMUNERATIVA.has(c.codigoMef))
  );
}

/** Al menos un valor: monto o porcentaje (Spec 013 / C1 — fórmula eliminada). */
export function atLeastOneConceptoValor(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const g = control as FormGroup;
    const hasNum = (v: unknown): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string' && v.trim() === '') return false;
      return Number.isFinite(Number(v));
    };
    return hasNum(g.get('monto')?.value) || hasNum(g.get('porcentaje')?.value)
      ? null
      : { valorRequerido: true };
  };
}

/** La vigencia "hasta" no puede ser anterior a la vigencia "desde". */
export function vigenciaRangoValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const g = control as FormGroup;
    const iniMes  = g.get('fechaInicioMes')?.value  as number | null;
    const iniAnio = g.get('fechaInicioAnio')?.value as number | null;
    const finMes  = g.get('fechaFinMes')?.value     as number | null;
    const finAnio = g.get('fechaFinAnio')?.value    as number | null;
    if (!iniMes || !iniAnio || !finMes || !finAnio) return null;
    const ini = `${iniAnio}-${String(iniMes).padStart(2, '0')}`;
    const fin = `${finAnio}-${String(finMes).padStart(2, '0')}`;
    return fin < ini ? { vigenciaInvalida: true } : null;
  };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Mes (1-12) + Año → "YYYY-MM-01" ISO; si falta alguno → null. */
function mesAnioAIsoDate(mes: number | null, anio: number | null): string | null {
  if (!mes || !anio) return null;
  return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

/** ISO `YYYY-MM-DD` → { mes: number, anio: number } | null. */
function isoDateAMesAnio(value: string | null | undefined): { mes: number; anio: number } | null {
  if (value == null || value.trim() === '') return null;
  const [anioStr, mesStr] = value.slice(0, 7).split('-');
  const mes = parseInt(mesStr, 10);
  const anio = parseInt(anioStr, 10);
  return Number.isFinite(mes) && Number.isFinite(anio) ? { mes, anio } : null;
}

export const MESES_NOMBRES: readonly string[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Genera rango de años: 5 años atrás hasta 5 años adelante desde el actual. */
function generarAnios(): readonly number[] {
  const actual = new Date().getFullYear();
  const anios: number[] = [];
  for (let y = actual - 5; y <= actual + 5; y++) anios.push(y);
  return anios;
}

@Component({
  selector: 'app-empleado-concepto-form-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-concepto-form-dialog.component.html',
  styleUrl: './empleado-concepto-form-dialog.component.css',
})
export class EmpleadoConceptoFormDialogComponent implements OnInit {
  readonly data: EmpleadoConceptoFormDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(
    MatDialogRef<EmpleadoConceptoFormDialogComponent, EmpleadoConceptoInput | undefined>,
  );
  private readonly fb = inject(FormBuilder);
  private readonly empleadoConceptoApi = inject(EmpleadoConceptoApiService);
  private readonly estimacionApi = inject(EstimacionNetoApiService);

  readonly catalogLoading = signal(true);
  readonly catalogError = signal(false);
  readonly opcionesConcepto = signal<readonly ConceptoPlanillaRow[]>([]);
  /** Régimen del empleado (de la planilla). null = sin planilla → no se puede filtrar. */
  readonly regimen = signal<string | null>(null);
  readonly esEdicion = computed(() => this.data.registro != null);

  /** Preview de neto (Spec 013 / C1). null = aún sin datos suficientes. */
  readonly estimacion = signal<EstimacionNetoResult | null>(null);
  readonly estimacionLoading = signal(false);
  readonly estimacionError = signal(false);

  /** REGLA SERVIR-07: si el neto estimado no cumple el 50%, se bloquea Guardar. */
  readonly bloqueaGuardar = computed(
    () => this.estimacion()?.cumpleRegla50 === false,
  );

  /** Concepto seleccionado actualmente (id del control). */
  readonly conceptoSeleccionadoId = signal<number | null>(null);

  readonly conceptoSeleccionado = computed<ConceptoPlanillaRow | null>(() => {
    const id = this.conceptoSeleccionadoId();
    if (id == null) return null;
    return this.opcionesConcepto().find((c) => c.id === id) ?? null;
  });

  /** El campo Porcentaje solo aplica al Aporte Facultativo 0.5% (SISPER-613). */
  readonly mostrarPorcentaje = computed(
    () => this.conceptoSeleccionado()?.codigoSisper === SISPER_APORTE_FACULTATIVO,
  );

  /** Conceptos asignables agrupados para el dropdown (mat-optgroup). */
  readonly gruposConcepto = computed<readonly ConceptoOptGroup[]>(() => {
    const voluntarios: ConceptoPlanillaRow[] = [];
    const ajustes: ConceptoPlanillaRow[] = [];
    const ingresos: ConceptoPlanillaRow[] = [];
    const otros: ConceptoPlanillaRow[] = [];

    for (const c of this.opcionesConcepto()) {
      if (esCalculadoPorMotor(c)) continue; // los calcula el motor — no manuales
      const sisper = c.codigoSisper ?? '';
      if (SISPER_VOLUNTARIOS.has(sisper)) {
        voluntarios.push(c);
      } else if (SISPER_AJUSTES.has(sisper)) {
        ajustes.push(c);
      } else if (c.tipoConcepto === 'REMUNERATIVO' || c.tipoConcepto === 'NO_REMUNERATIVO') {
        ingresos.push(c);
      } else {
        otros.push(c);
      }
    }

    return [
      { label: 'Descuentos Voluntarios', items: voluntarios },
      { label: 'Ajustes Especiales', items: ajustes },
      { label: 'Ingresos Manuales', items: ingresos },
      { label: 'Otros Descuentos', items: otros },
    ].filter((g) => g.items.length > 0);
  });

  readonly meses = MESES_NOMBRES;
  readonly anios = generarAnios();

  readonly form = this.fb.group(
    {
      conceptoPlanillaId: this.fb.control<number | null>(null, {
        validators: [Validators.required],
      }),
      monto: this.fb.control<number | null>(null),
      porcentaje: this.fb.control<number | null>(null),
      // Vigencia desde (requerida)
      fechaInicioMes:  this.fb.control<number | null>(null, { validators: [Validators.required] }),
      fechaInicioAnio: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      // Vigencia hasta (opcional)
      fechaFinMes:  this.fb.control<number | null>(null),
      fechaFinAnio: this.fb.control<number | null>(null),
    },
    { validators: [atLeastOneConceptoValor(), vigenciaRangoValido()] },
  );

  constructor() {
    // El concepto seleccionado controla la visibilidad del campo Porcentaje.
    // Al cambiar de concepto se limpia el campo que NO aplica para no enviar
    // monto y porcentaje a la vez.
    this.form.controls.conceptoPlanillaId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        this.conceptoSeleccionadoId.set(id);
        if (this.mostrarPorcentaje()) {
          this.form.controls.monto.setValue(null);
        } else {
          this.form.controls.porcentaje.setValue(null);
        }
      });

    // Preview de neto en tiempo real: al cambiar concepto o monto, debounce
    // 500ms y consulta el endpoint de estimación (solo lectura, no graba).
    const concepto$ = this.form.controls.conceptoPlanillaId.valueChanges.pipe(
      startWith(this.form.controls.conceptoPlanillaId.value),
    );
    const monto$ = this.form.controls.monto.valueChanges.pipe(
      startWith(this.form.controls.monto.value),
    );

    combineLatest([concepto$, monto$])
      .pipe(
        debounceTime(500),
        switchMap(([conceptoId, monto]) => {
          const m = toNullableNumber(monto);
          if (conceptoId == null || m == null || m <= 0) {
            this.estimacion.set(null);
            this.estimacionError.set(false);
            this.estimacionLoading.set(false);
            return EMPTY;
          }
          this.estimacionLoading.set(true);
          this.estimacionError.set(false);
          return this.estimacionApi
            .estimarNeto(this.data.empleadoId, { conceptoId, monto: m })
            .pipe(
              catchError(() => {
                this.estimacion.set(null);
                this.estimacionError.set(true);
                this.estimacionLoading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.estimacion.set(result);
        this.estimacionLoading.set(false);
      });
  }

  ngOnInit(): void {
    this.empleadoConceptoApi.listarAsignables(this.data.empleadoId).subscribe({
      next: (resp) => {
        this.regimen.set(resp.regimenLaboral);
        const active = resp.conceptos.filter((r) => r.activo === 1);
        const skip = this.data.conceptosYaAsignadosIds;
        const registro = this.data.registro;
        const filtered = skip
          ? active.filter(
              (r) =>
                !skip.has(r.id) ||
                (registro != null && r.id === registro.conceptoPlanillaId),
            )
          : active;
        this.opcionesConcepto.set(filtered);
        this.catalogLoading.set(false);
        if (registro != null) {
          const ini = isoDateAMesAnio(registro.fechaInicio);
          const fin = isoDateAMesAnio(registro.fechaFin);
          this.form.patchValue({
            conceptoPlanillaId: registro.conceptoPlanillaId,
            monto: registro.monto,
            porcentaje: registro.porcentaje,
            fechaInicioMes:  ini?.mes  ?? null,
            fechaInicioAnio: ini?.anio ?? null,
            fechaFinMes:  fin?.mes  ?? null,
            fechaFinAnio: fin?.anio ?? null,
          });
          this.form.controls.conceptoPlanillaId.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.catalogLoading.set(false);
        this.catalogError.set(true);
      },
    });
  }

  /** Etiqueta de la opción: "[CODIGO_MEF] — Nombre (SISPER-xxx)". */
  etiquetaConcepto(c: ConceptoPlanillaRow): string {
    const base = `[${c.codigoMef ?? c.codigo}] — ${c.nombre}`;
    return c.codigoSisper ? `${base} (SISPER-${c.codigoSisper})` : base;
  }

  /** Formatea un monto en soles para el preview de neto. */
  fmtMoneda(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    // REGLA SERVIR-07: no se guarda si el neto estimado cae bajo el 50%.
    if (this.form.invalid || this.bloqueaGuardar()) return;

    const v = this.form.getRawValue();
    const body: EmpleadoConceptoInput = {
      empleadoId: this.data.empleadoId,
      conceptoPlanillaId: v.conceptoPlanillaId as number,
      monto: toNullableNumber(v.monto),
      porcentaje: toNullableNumber(v.porcentaje),
      formula: null,
      fechaInicio: mesAnioAIsoDate(v.fechaInicioMes, v.fechaInicioAnio),
      fechaFin:    mesAnioAIsoDate(v.fechaFinMes,    v.fechaFinAnio),
    };
    this.dialogRef.close(body);
  }
}
