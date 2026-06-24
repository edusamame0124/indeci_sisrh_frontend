import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ConceptoRtpsApiService } from '../../services/concepto-rtps-api.service';
import { ConceptoTipoInternoApiService } from '../../services/concepto-tipo-interno-api.service';
import { PlanillaTipoApiService } from '../../services/planilla-tipo-api.service';
import type { ConceptoRtps } from '../../models/concepto-rtps.model';
import type { ConceptoTipoInterno } from '../../models/concepto-tipo-interno.model';
import type { PlanillaTipo } from '../../models/planilla-tipo.model';
import type {
  ConceptoPlanillaInput,
  ConceptoPlanillaTipoConcepto,
} from '../../models/concepto-planilla.model';
import {
  derivarTipoLegacy,
  derivarVisibilidad,
  derivarVistaPrevia,
  type ConceptoModoCalculo,
  type VistaPreviaEfecto,
} from '../../models/concepto-wizard.model';

/** Datos de apertura del wizard (modo crear vs configurar). */
export interface ConceptoWizardDialogData {
  /** Título del encabezado. */
  readonly title: string;
  /** `'crear'` = blank → BORRADOR; `'configurar'` = prefilled por fila. */
  readonly modo: 'crear' | 'configurar';
  /** Estado actual del concepto (solo display en TAB 1). */
  readonly estadoActual?: string | null;
  /** N.º de versión de la configuración (solo display en TAB 1 — P3 §12). */
  readonly version?: number | null;
  /** Valores iniciales (configurar). `null` = alta en blanco. */
  readonly initial: ConceptoPlanillaInput | null;
}

/** Agrupa los ítems RTPS bajo su cabecera de grupo (mat-optgroup). */
interface RtpsGrupo {
  readonly codigo: string;
  readonly descripcion: string;
  readonly items: readonly ConceptoRtps[];
}

const SI = 'S';
const NO = 'N';

/** Validador: el array de control debe tener al menos `min` elementos (§15). */
function minSeleccion(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as readonly unknown[] | null;
    return Array.isArray(value) && value.length >= min ? null : { minSeleccion: { min } };
  };
}

/**
 * Wizard de Creación / Configuración de Conceptos de Planilla
 * (SPEC_CONCEPTOS_PLANILLA §3.A · §6 · P2).
 *
 * <p>5 pasos con visibilidad condicional por `tipoConcepto`:</p>
 * <ol>
 *   <li>Datos básicos</li>
 *   <li>Regla de cálculo (afectaciones condicionales)</li>
 *   <li>Aplicabilidad (régimen + vigencia)</li>
 *   <li>Clasificación externa (RTPS + MEF/PLAME/MCPP/SUNAT)</li>
 *   <li>Revisión (resumen + advertencias)</li>
 * </ol>
 *
 * <p>Devuelve un {@link ConceptoPlanillaInput}; el backend fuerza
 * `estado = BORRADOR` al crear (no se envía estado).</p>
 */
@Component({
  selector: 'app-concepto-wizard-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepto-wizard-dialog.component.html',
  styleUrl: './concepto-wizard-dialog.component.css',
})
export class ConceptoWizardDialogComponent {
  readonly data: ConceptoWizardDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(
    MatDialogRef<ConceptoWizardDialogComponent, ConceptoPlanillaInput | undefined>,
  );
  private readonly fb = inject(FormBuilder);
  private readonly rtpsApi = inject(ConceptoRtpsApiService);
  private readonly tipoInternoApi = inject(ConceptoTipoInternoApiService);
  private readonly planillaTipoApi = inject(PlanillaTipoApiService);

  /**
   * Etiquetas legibles de la clasificación del motor (§13) y microcopy de su
   * efecto en el cálculo, para que RR.HH. entienda qué deriva el Tipo elegido.
   */
  private readonly clasificacionMotorInfo: Readonly<
    Record<ConceptoPlanillaTipoConcepto, { label: string; efecto: string }>
  > = {
    REMUNERATIVO: {
      label: 'Remunerativo',
      efecto:
        'Suma a los ingresos y, si corresponde, a la base de pensión, EsSalud e IR 5ta.',
    },
    NO_REMUNERATIVO: {
      label: 'No remunerativo',
      efecto:
        'Suma a los ingresos pero no integra la base de pensión ni de EsSalud.',
    },
    DESCUENTO: {
      label: 'Descuento',
      efecto: 'Resta del neto del trabajador (no es aporte del empleador).',
    },
    APORTE_TRABAJADOR: {
      label: 'Aporte del trabajador',
      efecto: 'Descuento previsional que afecta la base de pensión (ONP/AFP).',
    },
    APORTE_EMPLEADOR: {
      label: 'Aporte del empleador',
      efecto:
        'Costo de la entidad (no descuenta al trabajador); afecta la base EsSalud.',
    },
  };

  readonly modosCalculo: readonly {
    value: ConceptoModoCalculo;
    label: string;
    hint: string;
  }[] = [
    {
      value: 'MONTO_FIJO',
      label: 'Monto fijo',
      hint: 'Importe fijo definido para el concepto.',
    },
    {
      value: 'MONTO_INDIVIDUAL',
      label: 'Monto individual (por trabajador)',
      hint: 'Se ingresa por trabajador al asignar el concepto.',
    },
    {
      value: 'PORCENTAJE',
      label: 'Porcentaje',
      hint: 'Se calcula como % sobre la base correspondiente.',
    },
    {
      value: 'RESULTADO_MOTOR',
      label: 'Resultado del motor',
      hint: 'Lo calcula el motor de planilla; no se ingresa a mano.',
    },
    {
      value: 'IMPORTACION',
      label: 'Importación',
      hint: 'Se carga desde un archivo de importación.',
    },
  ];

  /** Modos en los que el monto NO es autocalculado por el motor (§14). */
  private readonly MODOS_MANUALES: ReadonlySet<ConceptoModoCalculo> = new Set<ConceptoModoCalculo>(
    ['MONTO_FIJO', 'PORCENTAJE'],
  );

  readonly regimenes: readonly { value: string; label: string }[] = [
    { value: 'TODOS', label: 'Todos los regímenes' },
    { value: '276', label: '276 — Carrera Administrativa' },
    { value: '728', label: '728 — Actividad Privada' },
    { value: '1057', label: '1057 — CAS' },
    { value: 'SERVIR', label: 'SERVIR' },
  ];

  // ─────────────── Estado del catálogo "Tipo de Concepto" (§13) ───────────────
  readonly tipoInternoLoading = signal(true);
  readonly tipoInternoError = signal(false);
  readonly tiposConcepto = signal<readonly ConceptoTipoInterno[]>([]);

  // ─────────────── Estado del catálogo "Tipo de planilla" (§15) ───────────────
  readonly planillaTiposLoading = signal(true);
  readonly planillaTiposError = signal(false);
  readonly planillaTiposCatalogo = signal<readonly PlanillaTipo[]>([]);

  // ─────────────── Estado del catálogo RTPS ───────────────
  readonly rtpsLoading = signal(true);
  readonly rtpsError = signal(false);
  private readonly rtpsList = signal<readonly ConceptoRtps[]>([]);
  readonly rtpsFilter = signal('');

  /** Grupos RTPS (mat-optgroup); cabeceras esGrupo='S' no seleccionables. */
  readonly rtpsGrupos = computed<readonly RtpsGrupo[]>(() => {
    const q = this.rtpsFilter().trim().toLowerCase();
    const items = this.rtpsList().filter((r) => r.esGrupo !== SI);
    const grupos = this.rtpsList().filter((r) => r.esGrupo === SI);

    const matched = q
      ? items.filter(
          (i) =>
            i.codigo.toLowerCase().includes(q) ||
            i.descripcion.toLowerCase().includes(q),
        )
      : items;

    const byGrupo = new Map<string, ConceptoRtps[]>();
    for (const it of matched) {
      const key = it.grupoCodigo ?? 'SIN_GRUPO';
      const arr = byGrupo.get(key) ?? [];
      arr.push(it);
      byGrupo.set(key, arr);
    }

    return grupos
      .map((g) => ({
        codigo: g.codigo,
        descripcion: g.descripcion,
        items: (byGrupo.get(g.codigo) ?? []).slice(),
      }))
      .filter((g) => g.items.length > 0);
  });

  /**
   * Código existente (solo edición). El input se oculta del wizard (§13): en
   * alta lo genera el backend; en edición se conserva sin mostrarlo.
   */
  private readonly codigoExistente: string | null = this.data.initial?.codigo ?? null;

  // ─────────────── Formularios por paso ───────────────
  readonly basicosForm = this.fb.group({
    nombre: this.fb.nonNullable.control(this.data.initial?.nombre ?? '', {
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    naturaleza: this.fb.nonNullable.control(this.data.initial?.naturaleza ?? '', {
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    tipoConceptoInterno: this.fb.nonNullable.control<string>(
      this.data.initial?.tipoConceptoInterno ?? '',
      { validators: [Validators.required] },
    ),
  });

  readonly calculoForm = this.fb.group({
    modoCalculo: this.fb.nonNullable.control<ConceptoModoCalculo>(
      this.data.initial?.modoCalculo ?? 'RESULTADO_MOTOR',
    ),
    esProrrateable: this.fb.nonNullable.control(this.data.initial?.esProrrateable === SI),
    afectoAportePens: this.fb.nonNullable.control(this.data.initial?.afectoAportePens === SI),
    afectoEssalud: this.fb.nonNullable.control(this.data.initial?.afectoEssalud === SI),
    afectoIr5ta: this.fb.nonNullable.control(this.data.initial?.afectoIr5ta === SI),
    esMuc: this.fb.nonNullable.control(this.data.initial?.esMuc === SI),
    esCuc: this.fb.nonNullable.control(this.data.initial?.esCuc === SI),
  });

  readonly aplicabilidadForm = this.fb.group({
    regimenAplicable: this.fb.nonNullable.control<string[]>(
      this.parseRegimen(this.data.initial?.regimenAplicable),
      { validators: [Validators.required] },
    ),
    fechaVigIni: this.fb.nonNullable.control(this.data.initial?.fechaVigIni ?? '', {
      validators: [Validators.required],
    }),
    fechaVigFin: this.fb.control<string | null>(this.data.initial?.fechaVigFin ?? null),
    // SPEC §15 (Fase A): el concepto se asocia a ≥1 tipo de planilla (M:N).
    planillaTipos: this.fb.nonNullable.control<string[]>(
      [...(this.data.initial?.planillaTipos ?? [])],
      { validators: [Validators.required, minSeleccion(1)] },
    ),
  });

  readonly clasificacionForm = this.fb.group({
    rtpsCodigo: this.fb.control<string | null>(this.data.initial?.rtpsCodigo ?? null),
    codigoMef: this.fb.control<string | null>(this.data.initial?.codigoMef ?? null),
    codigoSisper: this.fb.control<string | null>(this.data.initial?.codigoSisper ?? null),
    codigoPlameSunat: this.fb.control<string | null>(this.data.initial?.codigoPlameSunat ?? null),
    codigoMcpp: this.fb.control<string | null>(this.data.initial?.codigoMcpp ?? null),
    codigoTributoSunat: this.fb.control<string | null>(
      this.data.initial?.codigoTributoSunat ?? null,
    ),
  });

  // ─────────────── Señales reactivas ───────────────
  /** Código del Tipo de Concepto (catálogo SISPER) elegido por RR.HH. */
  private readonly tipoConceptoInterno = toSignal(
    this.basicosForm.controls.tipoConceptoInterno.valueChanges,
    { initialValue: this.basicosForm.controls.tipoConceptoInterno.value },
  );

  /** Ítem del catálogo seleccionado (o null si aún no se elige / no carga). */
  readonly itemTipoInterno = computed<ConceptoTipoInterno | null>(() => {
    const codigo = this.tipoConceptoInterno();
    if (!codigo) return null;
    return this.tiposConcepto().find((t) => t.codigo === codigo) ?? null;
  });

  /** Clasificación del motor derivada del Tipo de Concepto elegido (§13). */
  private readonly tipoConcepto = computed<ConceptoPlanillaTipoConcepto | null>(
    () => this.itemTipoInterno()?.clasificacionMotor ?? null,
  );

  /** Etiqueta + efecto de la clasificación del motor para mostrar a RR.HH. */
  readonly clasificacionMotor = computed(() => {
    const clasif = this.tipoConcepto();
    return clasif ? this.clasificacionMotorInfo[clasif] : null;
  });

  // Estados de validez por paso (reaccionan a cambios de los formularios).
  private readonly basicosStatus = toSignal(this.basicosForm.statusChanges, {
    initialValue: this.basicosForm.status,
  });
  private readonly aplicabilidadStatus = toSignal(this.aplicabilidadForm.statusChanges, {
    initialValue: this.aplicabilidadForm.status,
  });
  private readonly clasificacionStatus = toSignal(this.clasificacionForm.statusChanges, {
    initialValue: this.clasificacionForm.status,
  });

  /**
   * Visibilidad condicional de campos (función pura, testeable). Deriva de la
   * `clasificacionMotor` del Tipo de Concepto elegido (§13).
   */
  readonly visibilidad = computed(() => derivarVisibilidad(this.tipoConcepto()));

  /** Tipo legacy auto-derivado (INGRESO/DESCUENTO) para el payload. */
  readonly tipoLegacy = computed(() => derivarTipoLegacy(this.tipoConcepto()));

  // ─────────────── Vista previa del efecto (P4 — §14) ───────────────
  /** Modo de cálculo elegido (reactivo, para la vista previa). */
  private readonly modoCalculo = toSignal(
    this.calculoForm.controls.modoCalculo.valueChanges,
    { initialValue: this.calculoForm.controls.modoCalculo.value },
  );

  /** Afectaciones marcadas (reactivas, para la vista previa). */
  private readonly afectacionesValue = toSignal(this.calculoForm.valueChanges, {
    initialValue: this.calculoForm.getRawValue(),
  });

  /** Códigos de planilla seleccionados (reactivos, para chips y vista previa). */
  private readonly planillaTiposValue = toSignal(
    this.aplicabilidadForm.controls.planillaTipos.valueChanges,
    { initialValue: this.aplicabilidadForm.controls.planillaTipos.value },
  );

  /** Nombres de las planillas asociadas (código → nombre del catálogo, §15). */
  readonly planillasSeleccionadas = computed<readonly string[]>(() => {
    const cat = this.planillaTiposCatalogo();
    return this.planillaTiposValue().map(
      (cod) => cat.find((t) => t.codigo === cod)?.nombre ?? cod,
    );
  });

  /**
   * Vista previa cualitativa del efecto en planilla (función PURA, testeable).
   * Solo refleja afectaciones visibles para el tipo (las ocultas no se envían).
   */
  readonly vistaPrevia = computed<VistaPreviaEfecto>(() => {
    const cal = this.afectacionesValue();
    const v = this.visibilidad();
    return derivarVistaPrevia({
      modoCalculo: this.modoCalculo(),
      clasificacionMotor: this.tipoConcepto(),
      afectoAportePens: v.afectoAportePens && !!cal.afectoAportePens,
      afectoEssalud: v.afectoEssalud && !!cal.afectoEssalud,
      afectoIr5ta: v.afectoIr5ta && !!cal.afectoIr5ta,
      prorrateable: v.prorrateable && !!cal.esProrrateable,
      esMuc: v.mucCuc && !!cal.esMuc,
      esCuc: v.mucCuc && !!cal.esCuc,
      planillas: this.planillasSeleccionadas(),
    });
  });

  /**
   * Advertencia NO bloqueante (§14): el modo elegido es incoherente con la
   * clasificación del motor. Ej.: un aporte o un concepto que el motor calcula
   * marcado como "Monto fijo"/"Porcentaje" — sugerir "Resultado del motor".
   */
  readonly modoIncoherente = computed<string | null>(() => {
    const clasif = this.tipoConcepto();
    if (!clasif) return null;
    if (!this.MODOS_MANUALES.has(this.modoCalculo())) return null;
    if (clasif === 'APORTE_TRABAJADOR' || clasif === 'APORTE_EMPLEADOR') {
      return 'Los aportes los valoriza el motor con sus tasas vigentes. Considere "Resultado del motor".';
    }
    return null;
  });

  readonly estadoLabel = computed(() => {
    if (this.data.modo === 'crear') return 'BORRADOR (al registrar)';
    return this.data.estadoActual ?? 'BORRADOR';
  });

  /** Etiqueta de versión (solo display, modo configurar — P3 §12). */
  readonly versionLabel = computed(() => {
    if (this.data.modo === 'crear' || this.data.version == null) return null;
    return `v${this.data.version}`;
  });

  constructor() {
    this.cargarTiposInterno();
    this.cargarPlanillaTipos();
    this.cargarRtps();
    // Si MEF pasa a obligatorio según el tipo, reflejarlo en validadores.
    this.basicosForm.controls.tipoConceptoInterno.valueChanges.subscribe(() => {
      this.syncMefValidators();
    });
    this.syncMefValidators();
  }

  private cargarTiposInterno(): void {
    this.tipoInternoLoading.set(true);
    this.tipoInternoError.set(false);
    this.tipoInternoApi.listar().subscribe({
      next: (list) => {
        this.tiposConcepto.set(list);
        this.tipoInternoLoading.set(false);
        // En edición el valor inicial ya está; ahora que conocemos su
        // clasificación del motor, re-sincronizamos los validadores MEF.
        this.syncMefValidators();
      },
      error: () => {
        this.tipoInternoError.set(true);
        this.tipoInternoLoading.set(false);
      },
    });
  }

  private cargarPlanillaTipos(): void {
    this.planillaTiposLoading.set(true);
    this.planillaTiposError.set(false);
    this.planillaTipoApi.listar().subscribe({
      next: (list) => {
        this.planillaTiposCatalogo.set(list);
        this.planillaTiposLoading.set(false);
      },
      error: () => {
        this.planillaTiposError.set(true);
        this.planillaTiposLoading.set(false);
      },
    });
  }

  /** "Seleccionar todas" — marca todos los tipos del catálogo activo (§15). */
  seleccionarTodasPlanillas(): void {
    const codigos = this.planillaTiposCatalogo().map((t) => t.codigo);
    this.aplicabilidadForm.controls.planillaTipos.setValue(codigos);
    this.aplicabilidadForm.controls.planillaTipos.markAsDirty();
  }

  private cargarRtps(): void {
    this.rtpsLoading.set(true);
    this.rtpsError.set(false);
    this.rtpsApi.listar().subscribe({
      next: (list) => {
        this.rtpsList.set(list);
        this.rtpsLoading.set(false);
      },
      error: () => {
        this.rtpsError.set(true);
        this.rtpsLoading.set(false);
      },
    });
  }

  private syncMefValidators(): void {
    const ctrl = this.clasificacionForm.controls.codigoMef;
    if (this.visibilidad().codigoMefObligatorio) {
      ctrl.addValidators(Validators.required);
    } else {
      ctrl.removeValidators(Validators.required);
    }
    // Revalida y propaga el estado del grupo para que `puedeGuardar` reaccione
    // al cambio de obligatoriedad del código MEF según el tipo de concepto.
    ctrl.updateValueAndValidity();
    this.clasificacionForm.updateValueAndValidity();
  }

  onRtpsFilter(ev: Event): void {
    this.rtpsFilter.set((ev.target as HTMLInputElement).value);
  }

  /** Descripción legible de la opción RTPS seleccionada (para la revisión). */
  rtpsDescripcion(codigo: string | null): string | null {
    if (!codigo) return null;
    const found = this.rtpsList().find((r) => r.codigo === codigo);
    return found ? `${found.codigo} — ${found.descripcion}` : codigo;
  }

  /** Nombre SISPER del Tipo de Concepto elegido (para el resumen TAB 5). */
  labelTipoConcepto(codigo: string | null | undefined): string {
    return this.tiposConcepto().find((t) => t.codigo === codigo)?.nombre ?? '—';
  }

  labelRegimen(values: readonly string[]): string {
    if (!values.length) return '—';
    return values.join(', ');
  }

  // ─────────────── Validación / advertencias TAB 5 ───────────────

  /** Validez global: todos los pasos con campos obligatorios completos. */
  readonly puedeGuardar = computed(() => {
    void this.tipoConceptoInterno(); // re-evaluar al cambiar tipo (afecta validadores MEF)
    return (
      this.basicosStatus() === 'VALID' &&
      this.aplicabilidadStatus() === 'VALID' &&
      this.clasificacionStatus() === 'VALID'
    );
  });

  /** Advertencias normativas no bloqueantes para el TAB Revisión. */
  advertencias(): readonly string[] {
    const out: string[] = [];
    const v = this.visibilidad();
    const cal = this.calculoForm.getRawValue();
    const cla = this.clasificacionForm.getRawValue();

    if (v.codigoMefObligatorio && !cla.codigoMef) {
      out.push('Falta el código MEF/AIRHSP: un concepto pagable no podrá liquidarse (Ley 32448).');
    }
    if (cal.esMuc && cal.esCuc) {
      out.push('MUC y CUC marcados a la vez: revise LEY-07 (son campos distintos, no se mezclan).');
    }
    if (v.codigoTributoSunat && cal.afectoIr5ta && !cla.codigoTributoSunat) {
      out.push('Descuento afecto a 5ta sin código de tributo SUNAT: la retención podría quedar sin línea.');
    }
    return out;
  }

  // ─────────────── Submit ───────────────

  onSubmit(): void {
    this.basicosForm.markAllAsTouched();
    this.aplicabilidadForm.markAllAsTouched();
    this.clasificacionForm.markAllAsTouched();
    if (!this.puedeGuardar()) return;

    const body = this.buildPayload();
    this.dialogRef.close(body);
  }

  private buildPayload(): ConceptoPlanillaInput {
    const b = this.basicosForm.getRawValue();
    const cal = this.calculoForm.getRawValue();
    const apl = this.aplicabilidadForm.getRawValue();
    const cla = this.clasificacionForm.getRawValue();
    const v = this.visibilidad();

    return {
      // Alta: sin código (lo genera el backend, §13). Edición: se conserva.
      codigo: this.codigoExistente,
      nombre: b.nombre.trim().toUpperCase(),
      naturaleza: b.naturaleza.trim().toUpperCase(),
      // El server deriva `tipoConcepto` desde `tipoConceptoInterno`; aquí solo
      // enviamos el tipo legacy (INGRESO/DESCUENTO) y el código del catálogo.
      tipo: this.tipoLegacy(),
      tipoConceptoInterno: b.tipoConceptoInterno,

      // P4 — §14: el modo de cálculo se persiste (metadata/intención). El motor
      // NO se ramifica por este valor; solo documenta cómo se origina el monto.
      modoCalculo: cal.modoCalculo,

      esProrrateable: v.prorrateable ? this.sn(cal.esProrrateable) : NO,
      afectoAportePens: v.afectoAportePens ? this.sn(cal.afectoAportePens) : NO,
      afectoEssalud: v.afectoEssalud ? this.sn(cal.afectoEssalud) : NO,
      afectoIr5ta: v.afectoIr5ta ? this.sn(cal.afectoIr5ta) : NO,
      esMuc: v.mucCuc ? this.sn(cal.esMuc) : NO,
      esCuc: v.mucCuc ? this.sn(cal.esCuc) : NO,

      regimenAplicable: this.serializeRegimen(apl.regimenAplicable),
      fechaVigIni: apl.fechaVigIni || null,
      fechaVigFin: apl.fechaVigFin || null,

      // SPEC §15 (Fase A): ≥1 código de tipo de planilla (el backend lo exige).
      planillaTipos: [...apl.planillaTipos],

      rtpsCodigo: this.nullable(cla.rtpsCodigo),
      codigoMef: this.nullable(cla.codigoMef),
      codigoSisper: this.nullable(cla.codigoSisper),
      codigoPlameSunat: this.nullable(cla.codigoPlameSunat),
      codigoMcpp: this.nullable(cla.codigoMcpp),
      codigoTributoSunat: v.codigoTributoSunat ? this.nullable(cla.codigoTributoSunat) : null,
    };
  }

  // ─────────────── Helpers ───────────────

  private sn(value: boolean): string {
    return value ? SI : NO;
  }

  private nullable(value: string | null | undefined): string | null {
    const t = (value ?? '').trim();
    return t.length ? t.toUpperCase() : null;
  }

  private parseRegimen(value: string | null | undefined): string[] {
    if (!value || value.trim() === '') return ['TODOS'];
    if (value.toUpperCase() === 'TODOS') return ['TODOS'];
    return value
      .toUpperCase()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  /** "TODOS" anula la lista; en otro caso CSV ordenado sin "TODOS". */
  private serializeRegimen(values: readonly string[]): string {
    if (!values.length || values.includes('TODOS')) return 'TODOS';
    return values.map((v) => v.toUpperCase().trim()).join(',');
  }
}
