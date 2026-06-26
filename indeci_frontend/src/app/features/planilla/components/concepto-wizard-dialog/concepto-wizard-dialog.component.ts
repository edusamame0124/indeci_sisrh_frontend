import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, map, of, switchMap, tap } from 'rxjs';
import { ConceptoRtpsApiService } from '../../services/concepto-rtps-api.service';
import { ConceptoTipoInternoApiService } from '../../services/concepto-tipo-interno-api.service';
import { PlanillaTipoApiService } from '../../services/planilla-tipo-api.service';
import { CatalogoMgrhApiService } from '../../services/catalogo-mgrh-api.service';
import { UppercaseDirective } from '../../../../shared/directives/uppercase.directive';
import type { ConceptoRtps } from '../../models/concepto-rtps.model';
import type { ConceptoTipoInterno } from '../../models/concepto-tipo-interno.model';
import type { PlanillaTipo } from '../../models/planilla-tipo.model';
import { PlanillaTipoFormDialogComponent } from '../planilla-tipo-form-dialog/planilla-tipo-form-dialog.component';
import type { CatalogoConceptoMgrh } from '../../models/catalogo-mgrh.model';
import type {
  ConceptoMgrhResumen,
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
  /** TÃ­tulo del encabezado. */
  readonly title: string;
  /** `'crear'` = blank â†’ BORRADOR; `'configurar'` = prefilled por fila. */
  readonly modo: 'crear' | 'configurar';
  /** Estado actual del concepto (solo display en TAB 1). */
  readonly estadoActual?: string | null;
  /** N.Âº de versiÃ³n de la configuraciÃ³n (solo display en TAB 1 â€” P3 Â§12). */
  readonly version?: number | null;
  /** Valores iniciales (configurar). `null` = alta en blanco. */
  readonly initial: ConceptoPlanillaInput | null;
  /**
   * Resumen MGRH homologado del concepto en ediciÃ³n (SPEC_HOMOLOGACION_MGRH Â§F).
   * Permite precargar el detalle de la pestaÃ±a de homologaciÃ³n sin re-buscar.
   */
  readonly mgrhResumen?: ConceptoMgrhResumen | null;
}

/** Agrupa los Ã­tems RTPS bajo su cabecera de grupo (mat-optgroup). */
interface RtpsGrupo {
  readonly codigo: string;
  readonly descripcion: string;
  readonly items: readonly ConceptoRtps[];
}
type TipoLocalMgrh = 'INGRESO' | 'DESCUENTO' | 'APORTE';

interface TipoLocalMgrhView {
  readonly local: TipoLocalMgrh;
  readonly localLabel: string;
  readonly mgrh: 'INGRESOS' | 'EGRESOS' | 'APORTES';
}

const SI = 'S';
const NO = 'N';

/** Validador: el array de control debe tener al menos `min` elementos (Â§15). */
function minSeleccion(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as readonly unknown[] | null;
    return Array.isArray(value) && value.length >= min ? null : { minSeleccion: { min } };
  };
}

/**
 * Wizard de CreaciÃ³n / ConfiguraciÃ³n de Conceptos de Planilla
 * (SPEC_CONCEPTOS_PLANILLA Â§3.A Â· Â§6 Â· P2).
 *
 * <p>5 pasos con visibilidad condicional por `tipoConcepto`:</p>
 * <ol>
 *   <li>Datos bÃ¡sicos</li>
 *   <li>Regla de cÃ¡lculo (afectaciones condicionales)</li>
 *   <li>Aplicabilidad (rÃ©gimen + vigencia)</li>
 *   <li>ClasificaciÃ³n externa (RTPS + MEF/PLAME/MCPP/SUNAT)</li>
 *   <li>RevisiÃ³n (resumen + advertencias)</li>
 * </ol>
 *
 * <p>Devuelve un {@link ConceptoPlanillaInput}; el backend fuerza
 * `estado = BORRADOR` al crear (no se envÃ­a estado).</p>
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
    MatAutocompleteModule,
    MatRadioModule,
    MatSelectModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    UppercaseDirective,
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
  private readonly dialog = inject(MatDialog);
  private readonly rtpsApi = inject(ConceptoRtpsApiService);
  private readonly tipoInternoApi = inject(ConceptoTipoInternoApiService);
  private readonly planillaTipoApi = inject(PlanillaTipoApiService);
  private readonly catalogoMgrhApi = inject(CatalogoMgrhApiService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Etiquetas legibles de la clasificaciÃ³n del motor (Â§13) y microcopy de su
   * efecto en el cÃ¡lculo, para que RR.HH. entienda quÃ© deriva el Tipo elegido.
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

  /** Modos en los que el monto NO es autocalculado por el motor (Â§14). */
  private readonly MODOS_MANUALES: ReadonlySet<ConceptoModoCalculo> = new Set<ConceptoModoCalculo>(
    ['MONTO_FIJO', 'PORCENTAJE'],
  );

  readonly regimenes: readonly { value: string; label: string }[] = [
    { value: 'TODOS', label: 'Todos los regímenes' },
    { value: '276', label: '276 — Carrera Administrativa' },
    { value: '1057', label: '1057 — CAS' },
    { value: 'SERVIR', label: 'SERVIR' },
  ];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Estado del catÃ¡logo "Tipo de Concepto" (Â§13) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  readonly tipoInternoLoading = signal(true);
  readonly tipoInternoError = signal(false);
  readonly tiposConcepto = signal<readonly ConceptoTipoInterno[]>([]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Estado del catÃ¡logo "Tipo de planilla" (Â§15) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  readonly planillaTiposLoading = signal(true);
  readonly planillaTiposError = signal(false);
  readonly planillaTiposCatalogo = signal<readonly PlanillaTipo[]>([]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Estado del catÃ¡logo RTPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HomologaciÃ³n MGRH / MEF (SPEC_HOMOLOGACION_MGRH Â§G) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Tipos oficiales MGRH para el filtro del buscador (Â§B/D1 â€” sin GASTOS POR ENCARGO). */
  readonly tiposMgrh: readonly { value: string; label: string }[] = [
    { value: 'INGRESOS', label: 'Ingresos' },
    { value: 'EGRESOS', label: 'Egresos' },
    { value: 'APORTES', label: 'Aportes' },
  ];

  /** Campo unico type-ahead para homologar contra el catalogo MGRH / MEF. */
  readonly mgrhBusqueda = this.fb.nonNullable.control({ value: '', disabled: true });

  /** Observación interna de la homologación MGRH (opcional, libre). */
  readonly mgrhObservacion = this.fb.nonNullable.control(
    this.data.initial?.observacionHomologacionMgrh ?? '',
  );

  readonly MGRH_AUTOCOMPLETE_LIMIT = 15;
  readonly mgrhBuscando = signal(false);
  readonly mgrhError = signal(false);
  readonly mgrhBuscado = signal(false);
  readonly mgrhResultados = signal<readonly CatalogoConceptoMgrh[]>([]);  /** Detalle solo-lectura del concepto MGRH seleccionado (homologaciÃ³n vigente). */
  readonly mgrhSeleccionado = signal<CatalogoConceptoMgrh | null>(null);
  /** FK al catÃ¡logo homologado (`null` = pendiente). Espejo del seleccionado/precarga. */
  private readonly mgrhId = signal<number | null>(
    this.data.initial?.catalogoConceptoMgrhId ?? null,
  );

  /** Candidato elegido del autocomplete, aún NO aplicado (requiere botón "Aplicar"). */
  readonly mgrhCandidato = signal<CatalogoConceptoMgrh | null>(null);

  /** Chip de estado de homologacion: pendiente, activo o historico inactivo. */
  readonly mgrhHomologado = computed(() => this.mgrhId() !== null);

  /** Hay un candidato elegido distinto del ya homologado → habilita "Aplicar". */
  readonly mgrhPuedeAplicar = computed(() => {
    const c = this.mgrhCandidato();
    return c !== null && c.id !== this.mgrhId();
  });
  readonly mgrhCatalogoInactivo = computed(() => {
    const sel = this.mgrhSeleccionado();
    if (!sel) return false;
    return !sel.seleccionable || !sel.vigente || this.normalizarEstadoMgrh(sel.estado) === 'INACTIVO';
  });
  readonly mgrhEstadoChipLabel = computed(() => {
    if (!this.mgrhHomologado()) return 'Pendiente de homologacion';
    return this.mgrhCatalogoInactivo()
      ? 'Homologacion con catalogo inactivo'
      : 'Homologado';
  });
  readonly mgrhEstadoChipIcon = computed(() => {
    if (!this.mgrhHomologado()) return 'pending';
    return this.mgrhCatalogoInactivo() ? 'warning' : 'verified';
  });

  /**
   * Advertencia de compatibilidad NO bloqueante (Â§G â€” mapeo clasificaciÃ³nâ†’TIPO MGRH).
   * `null` si no hay selecciÃ³n, falta clasificaciÃ³n, o el tipo coincide.
   */
  readonly mgrhTipoIncompatible = computed<string | null>(() => {
    const sel = this.mgrhSeleccionado();
    const esperado = this.tipoMgrhEsperado();
    if (!sel || !esperado) return null;
    return sel.tipo === esperado ? null : esperado;
  });

  /** Tipo local y tipo MGRH permitido derivados del Tipo de Concepto local. */
  readonly tipoLocalMgrh = computed<TipoLocalMgrhView | null>(() => {
    switch (this.tipoConcepto()) {
      case 'REMUNERATIVO':
      case 'NO_REMUNERATIVO':
        return { local: 'INGRESO', localLabel: 'Ingreso', mgrh: 'INGRESOS' };
      case 'DESCUENTO':
        return { local: 'DESCUENTO', localLabel: 'Descuento', mgrh: 'EGRESOS' };
      case 'APORTE_TRABAJADOR':
      case 'APORTE_EMPLEADOR':
        return { local: 'APORTE', localLabel: 'Aporte', mgrh: 'APORTES' };
      default:
        return null;
    }
  });

  readonly tipoLocalLabel = computed(() => this.tipoLocalMgrh()?.localLabel ?? 'No definido');
  readonly tipoMgrhPermitidoLabel = computed(() => this.tipoLocalMgrh()?.mgrh ?? 'No definido');

  /** TIPO MGRH esperado segun la clasificacion del motor del concepto. */
  private readonly tipoMgrhEsperado = computed<string | null>(() => this.tipoLocalMgrh()?.mgrh ?? null);

  /**
   * CÃ³digo existente (solo ediciÃ³n). El input se oculta del wizard (Â§13): en
   * alta lo genera el backend; en ediciÃ³n se conserva sin mostrarlo.
   */
  private readonly codigoExistente: string | null = this.data.initial?.codigo ?? null;

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Formularios por paso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // ¿El concepto se incluirá en una planilla de pago institucional? Gobierna las
    // planillas asociadas. Se deriva en edición: "SI" si ya tiene planillas, "NO" si 0.
    incluyeEnPlanilla: this.fb.nonNullable.control<'SI' | 'NO'>(
      this.data.initial?.incluyeEnPlanilla === 'N'
        ? 'NO'
        : this.data.initial?.incluyeEnPlanilla === 'S'
          ? 'SI'
          : this.data.initial == null
            ? 'SI'
            : (this.data.initial.planillaTipos?.length ?? 0) > 0
              ? 'SI'
              : 'NO',
      { validators: [Validators.required] },
    ),
    regimenAplicable: this.fb.nonNullable.control<string[]>(
      this.parseRegimen(this.data.initial?.regimenAplicable),
      { validators: [Validators.required] },
    ),
    fechaVigIni: this.fb.nonNullable.control(this.data.initial?.fechaVigIni ?? '', {
      validators: [Validators.required],
    }),
    fechaVigFin: this.fb.control<string | null>(this.data.initial?.fechaVigFin ?? null),
    // SPEC Â§15 (Fase A): el concepto se asocia a â‰¥1 tipo de planilla (M:N).
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SeÃ±ales reactivas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** CÃ³digo del Tipo de Concepto (catÃ¡logo SISPER) elegido por RR.HH. */
  private readonly tipoConceptoInterno = toSignal(
    this.basicosForm.controls.tipoConceptoInterno.valueChanges,
    { initialValue: this.basicosForm.controls.tipoConceptoInterno.value },
  );

  /** Ãtem del catÃ¡logo seleccionado (o null si aÃºn no se elige / no carga). */
  readonly itemTipoInterno = computed<ConceptoTipoInterno | null>(() => {
    const codigo = this.tipoConceptoInterno();
    if (!codigo) return null;
    return this.tiposConcepto().find((t) => t.codigo === codigo) ?? null;
  });

  /** ClasificaciÃ³n del motor derivada del Tipo de Concepto elegido (Â§13). */
  private readonly tipoConcepto = computed<ConceptoPlanillaTipoConcepto | null>(
    () => this.itemTipoInterno()?.clasificacionMotor ?? null,
  );

  /** Etiqueta + efecto de la clasificaciÃ³n del motor para mostrar a RR.HH. */
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
   * Visibilidad condicional de campos (funciÃ³n pura, testeable). Deriva de la
   * `clasificacionMotor` del Tipo de Concepto elegido (Â§13).
   */
  readonly visibilidad = computed(() => derivarVisibilidad(this.tipoConcepto()));

  /** Tipo legacy auto-derivado (INGRESO/DESCUENTO) para el payload. */
  readonly tipoLegacy = computed(() => derivarTipoLegacy(this.tipoConcepto()));

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Vista previa del efecto (P4 â€” Â§14) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Modo de cÃ¡lculo elegido (reactivo, para la vista previa). */
  private readonly modoCalculo = toSignal(
    this.calculoForm.controls.modoCalculo.valueChanges,
    { initialValue: this.calculoForm.controls.modoCalculo.value },
  );

  /** Afectaciones marcadas (reactivas, para la vista previa). */
  private readonly afectacionesValue = toSignal(this.calculoForm.valueChanges, {
    initialValue: this.calculoForm.getRawValue(),
  });

  /** CÃ³digos de planilla seleccionados (reactivos, para chips y vista previa). */
  private readonly planillaTiposValue = toSignal(
    this.aplicabilidadForm.controls.planillaTipos.valueChanges,
    { initialValue: this.aplicabilidadForm.controls.planillaTipos.value },
  );

  /** "SI" = el concepto va a planilla de pago → muestra/exige las planillas asociadas. */
  readonly incluyeEnPlanilla = toSignal(
    this.aplicabilidadForm.controls.incluyeEnPlanilla.valueChanges,
    { initialValue: this.aplicabilidadForm.controls.incluyeEnPlanilla.value },
  );

  /** Nombres de las planillas asociadas (cÃ³digo â†’ nombre del catÃ¡logo, Â§15). */
  readonly planillasSeleccionadas = computed<readonly string[]>(() => {
    const cat = this.planillaTiposCatalogo();
    return this.planillaTiposValue().map(
      (cod) => cat.find((t) => t.codigo === cod)?.nombre ?? cod,
    );
  });

  /**
   * Vista previa cualitativa del efecto en planilla (funciÃ³n PURA, testeable).
   * Solo refleja afectaciones visibles para el tipo (las ocultas no se envÃ­an).
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
   * Advertencia NO bloqueante (Â§14): el modo elegido es incoherente con la
   * clasificaciÃ³n del motor. Ej.: un aporte o un concepto que el motor calcula
   * marcado como "Monto fijo"/"Porcentaje" â€” sugerir "Resultado del motor".
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

  /** Etiqueta de versiÃ³n (solo display, modo configurar â€” P3 Â§12). */
  readonly versionLabel = computed(() => {
    if (this.data.modo === 'crear' || this.data.version == null) return null;
    return `v${this.data.version}`;
  });

  constructor() {
    this.cargarTiposInterno();
    this.cargarPlanillaTipos();
    this.cargarRtps();
    this.precargarHomologacion();
    this.inicializarBusquedaMgrh();
    this.basicosForm.controls.tipoConceptoInterno.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncMefValidators();
        this.sincronizarEstadoBusquedaMgrh();
      });
    this.syncMefValidators();
    this.sincronizarEstadoBusquedaMgrh();

    // Gating planillas: "NO" oculta/vacía y quita el validador ≥1; "SI" lo exige.
    this.aplicabilidadForm.controls.incluyeEnPlanilla.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.sincronizarPlanillaTipos(v));
    this.sincronizarPlanillaTipos(this.aplicabilidadForm.controls.incluyeEnPlanilla.value);
  }

  /**
   * Sincroniza las planillas asociadas con la respuesta "¿se incluirá en planilla?":
   * "SI" exige ≥1; "NO" limpia la selección y quita la obligatoriedad (solo
   * configuración / cálculo / control, sin planilla de pago).
   */
  private sincronizarPlanillaTipos(incluye: 'SI' | 'NO'): void {
    const ctrl = this.aplicabilidadForm.controls.planillaTipos;
    if (incluye === 'SI') {
      ctrl.setValidators([Validators.required, minSeleccion(1)]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue([], { emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private cargarTiposInterno(): void {
    this.tipoInternoLoading.set(true);
    this.tipoInternoError.set(false);
    this.tipoInternoApi.listar().subscribe({
      next: (list) => {
        this.tiposConcepto.set(list);
        this.tipoInternoLoading.set(false);
        // En ediciÃ³n el valor inicial ya estÃ¡; ahora que conocemos su
        // clasificaciÃ³n del motor, re-sincronizamos los validadores MEF.
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

  abrirNuevoTipoPlanilla(): void {
    const dialogRef = this.dialog.open(PlanillaTipoFormDialogComponent, {
      width: '450px',
      data: {
        title: 'Nuevo tipo de planilla',
        modo: 'crear',
        submitLabel: 'Guardar',
        initial: null,
      },
    });

    dialogRef.afterClosed().pipe(
      filter(Boolean),
      switchMap((payload) => this.planillaTipoApi.crear(payload as any))
    ).subscribe({
      next: (nuevo) => {
        if (!nuevo) return;
        // Recargar el catalogo y autoseleccionar
        this.planillaTipoApi.listar().subscribe((list) => {
          this.planillaTiposCatalogo.set(list);
          const actuales = this.aplicabilidadForm.controls.planillaTipos.value;
          this.aplicabilidadForm.controls.planillaTipos.setValue([...actuales, nuevo.codigo]);
          this.aplicabilidadForm.controls.planillaTipos.markAsDirty();
        });
      },
      error: () => {
        // En un caso real mostraríamos un snackbar, por ahora solo ignoramos
      }
    });
  }

  eliminarTipoPlanilla(event: Event, p: PlanillaTipo): void {
    event.stopPropagation();
    if (!confirm(`¿Seguro de eliminar el tipo de planilla: ${p.nombre}?`)) {
      return;
    }
    this.planillaTipoApi.eliminar(p.codigo).subscribe({
      next: () => {
        this.planillaTipoApi.listar().subscribe((list) => {
          this.planillaTiposCatalogo.set(list);
          const actuales = this.aplicabilidadForm.controls.planillaTipos.value;
          this.aplicabilidadForm.controls.planillaTipos.setValue(actuales.filter(c => c !== p.codigo));
        });
      }
    });
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HomologaciÃ³n MGRH / MEF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Precarga el detalle del concepto MGRH homologado en ediciÃ³n (Â§F). Usa el
   * resumen del row si llegÃ³; si solo hay FK, lo resuelve con una bÃºsqueda
   * puntual por cÃ³digo (soloSeleccionables=false para no excluir homologaciones
   * a registros no ordinarios ya existentes).
   */
  private precargarHomologacion(): void {
    const resumen = this.data.mgrhResumen ?? null;
    const fkId = this.data.initial?.catalogoConceptoMgrhId ?? null;
    if (resumen) {
      // El resumen no trae todos los campos oficiales; mostramos lo disponible y
      // refrescamos con la bÃºsqueda puntual para completar el panel de detalle.
      this.buscarPorCodigoParaPrecarga(resumen.codigoConceptoMgrh, resumen.tipo, fkId);
    } else if (fkId !== null) {
      this.mgrhId.set(fkId);
    }
  }

  /** Resuelve el detalle completo del homologado por cÃ³digo + tipo (precarga). */
  private buscarPorCodigoParaPrecarga(
    codigo: string,
    tipo: string,
    fkId: number | null,
  ): void {
    this.catalogoMgrhApi
      .buscar({ codigo, tipo, soloSeleccionables: false, soloVigentes: false }, 0, 20)
      .subscribe({
        next: (page) => {
          const match =
            page.content.find((c) => c.id === fkId) ??
            page.content.find((c) => c.codigoConceptoMgrh === codigo && c.tipo === tipo) ??
            null;
          if (match) {
            this.mgrhSeleccionado.set(match);
            this.mgrhId.set(match.id);
            this.mgrhBusqueda.setValue(this.mgrhOpcionLabel(match), { emitEvent: false });
          } else if (fkId !== null) {
            this.mgrhId.set(fkId);
          }
        },
        error: () => {
          if (fkId !== null) this.mgrhId.set(fkId);
        },
      });
  }

  private inicializarBusquedaMgrh(): void {
    this.mgrhBusqueda.valueChanges
      .pipe(
        // Al seleccionar una opción, Material emite el OBJETO en valueChanges.
        // Solo procesamos texto tecleado (string); así la selección no borra el
        // candidato ni rompe puedeBuscarMgrh() con un .trim() sobre un objeto.
        filter((texto): texto is string => typeof texto === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        tap((texto) => this.prepararBusquedaMgrh(texto)),
        filter((texto) => this.puedeBuscarMgrh(texto)),
        switchMap((texto) => this.buscarOpcionesMgrh(texto)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.mgrhResultados.set(items);
      });
  }

  private prepararBusquedaMgrh(texto: string): void {
    const seleccionado = this.mgrhSeleccionado();
    if (seleccionado && texto !== this.mgrhOpcionLabel(seleccionado)) {
      this.mgrhSeleccionado.set(null);
      this.mgrhId.set(null);
    }
    const candidato = this.mgrhCandidato();
    if (candidato && texto !== this.mgrhOpcionLabel(candidato)) {
      this.mgrhCandidato.set(null);
    }
    this.mgrhError.set(false);
    this.mgrhBuscado.set(false);
    this.mgrhResultados.set([]);
    if (!this.puedeBuscarMgrh(texto)) {
      this.mgrhBuscando.set(false);
    }
  }

  private puedeBuscarMgrh(texto: string): boolean {
    return !!this.tipoLocalMgrh() && texto.trim().length >= 2;
  }

  private buscarOpcionesMgrh(texto: string) {
    const tipoLocal = this.tipoLocalMgrh();
    if (!tipoLocal) return of([] as CatalogoConceptoMgrh[]);

    this.mgrhBuscando.set(true);
    return this.catalogoMgrhApi
      .buscar(
        {
          texto,
          tipoLocal: tipoLocal.local,
          soloActivos: true,
          limit: this.MGRH_AUTOCOMPLETE_LIMIT,
          soloSeleccionables: true,
          soloVigentes: true,
        },
        0,
        this.MGRH_AUTOCOMPLETE_LIMIT,
      )
      .pipe(
        tap(() => this.mgrhBuscado.set(true)),
        map((page) => page.content),
        catchError(() => {
          this.mgrhError.set(true);
          this.mgrhBuscado.set(true);
          return of([] as CatalogoConceptoMgrh[]);
        }),
        finalize(() => this.mgrhBuscando.set(false)),
      );
  }

  private sincronizarEstadoBusquedaMgrh(): void {
    if (this.tipoLocalMgrh()) {
      this.mgrhBusqueda.enable({ emitEvent: false });
      return;
    }
    this.mgrhBusqueda.disable({ emitEvent: false });
    this.mgrhBusqueda.setValue('', { emitEvent: false });
    this.mgrhResultados.set([]);
    this.mgrhBuscando.set(false);
    this.mgrhBuscado.set(false);
    this.mgrhError.set(false);
  }

  limpiarBusquedaMgrh(): void {
    this.mgrhBusqueda.setValue('');
    this.mgrhResultados.set([]);
    this.mgrhBuscado.set(false);
    this.mgrhError.set(false);
    this.mgrhCandidato.set(null);
  }

  /** Paso 1 — elige un candidato del autocomplete (NO homologa todavía). */
  elegirCandidatoMgrh(item: CatalogoConceptoMgrh): void {
    this.mgrhCandidato.set(item);
    this.mgrhBusqueda.setValue(this.mgrhOpcionLabel(item), { emitEvent: false });
    this.mgrhResultados.set([]);
  }

  /** Paso 2 — aplica el candidato: el concepto pasa a "Homologado" (antes de guardar). */
  aplicarHomologacion(): void {
    const c = this.mgrhCandidato();
    if (!c) return;
    this.mgrhSeleccionado.set(c);
    this.mgrhId.set(c.id);
    this.mgrhCandidato.set(null);
  }

  /** Cambiar: limpia la selección para buscar otra opción (conserva la observación). */
  cambiarHomologacion(): void {
    this.mgrhSeleccionado.set(null);
    this.mgrhId.set(null);
    this.limpiarBusquedaMgrh();
  }

  /** Quita la homologacion: vuelve a Pendiente y permite guardar sin FK. */
  quitarHomologacion(): void {
    this.mgrhSeleccionado.set(null);
    this.mgrhId.set(null);
    this.limpiarBusquedaMgrh();
  }

  /** Texto visible de cada opcion del autocomplete. */
  mgrhOpcionLabel(item: CatalogoConceptoMgrh | null): string {
    if (!item) return '';
    const textoOficial = item.detalleNorma?.trim() || item.descripcionNorma?.trim() || 'Sin descripcion oficial';
    return `[${item.codigoConceptoMgrh}] ${textoOficial} | ${item.tipo} | ${item.estado || 'Sin estado'}`;
  }

  private normalizarEstadoMgrh(estado: string | null): string {
    return (estado ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  /** Etiqueta legible del TIPO MGRH (para la advertencia de compatibilidad). */
  labelTipoMgrh(tipo: string | null): string {
    return this.tiposMgrh.find((t) => t.value === tipo)?.label ?? (tipo ?? '—');
  }

  private syncMefValidators(): void {
    const ctrl = this.clasificacionForm.controls.codigoMef;
    if (this.visibilidad().codigoMefObligatorio) {
      ctrl.addValidators(Validators.required);
    } else {
      ctrl.removeValidators(Validators.required);
    }
    // Revalida y propaga el estado del grupo para que `puedeGuardar` reaccione
    // al cambio de obligatoriedad del cÃ³digo MEF segÃºn el tipo de concepto.
    ctrl.updateValueAndValidity();
    this.clasificacionForm.updateValueAndValidity();
  }

  onRtpsFilter(ev: Event): void {
    this.rtpsFilter.set((ev.target as HTMLInputElement).value);
  }

  /** DescripciÃ³n legible de la opciÃ³n RTPS seleccionada (para la revisiÃ³n). */
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ValidaciÃ³n / advertencias TAB 5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Validez global: todos los pasos con campos obligatorios completos. */
  readonly puedeGuardar = computed(() => {
    void this.tipoConceptoInterno(); // re-evaluar al cambiar tipo (afecta validadores MEF)
    return (
      this.basicosStatus() === 'VALID' &&
      this.aplicabilidadStatus() === 'VALID' &&
      this.clasificacionStatus() === 'VALID'
    );
  });

  /** Advertencias normativas no bloqueantes para el TAB RevisiÃ³n. */
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      // Alta: sin cÃ³digo (lo genera el backend, Â§13). EdiciÃ³n: se conserva.
      codigo: this.codigoExistente,
      nombre: b.nombre.trim().toUpperCase(),
      naturaleza: b.naturaleza.trim().toUpperCase(),
      // El server deriva `tipoConcepto` desde `tipoConceptoInterno`; aquÃ­ solo
      // enviamos el tipo legacy (INGRESO/DESCUENTO) y el cÃ³digo del catÃ¡logo.
      tipo: this.tipoLegacy(),
      tipoConceptoInterno: b.tipoConceptoInterno,

      // P4 â€” Â§14: el modo de cÃ¡lculo se persiste (metadata/intenciÃ³n). El motor
      // NO se ramifica por este valor; solo documenta cÃ³mo se origina el monto.
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

      // SPEC Â§15 (Fase A): â‰¥1 cÃ³digo de tipo de planilla (el backend lo exige).
      planillaTipos: [...apl.planillaTipos],
      incluyeEnPlanilla: apl.incluyeEnPlanilla === 'NO' ? 'N' : 'S',

      rtpsCodigo: this.nullable(cla.rtpsCodigo),
      codigoMef: this.nullable(cla.codigoMef),
      codigoSisper: this.nullable(cla.codigoSisper),
      codigoPlameSunat: this.nullable(cla.codigoPlameSunat),
      codigoMcpp: this.nullable(cla.codigoMcpp),
      codigoTributoSunat: v.codigoTributoSunat ? this.nullable(cla.codigoTributoSunat) : null,

      // SPEC_HOMOLOGACION_MGRH Â§C.2/Â§D5: FK Ãºnica nullable al catÃ¡logo MGRH.
      catalogoConceptoMgrhId: this.mgrhId(),
      observacionHomologacionMgrh: this.mgrhObservacion.value.trim() || null,
    };
  }

  /** LÃ­nea de homologaciÃ³n para el resumen del TAB RevisiÃ³n (Â§G). */
  readonly mgrhResumenLinea = computed<string | null>(() => {
    const sel = this.mgrhSeleccionado();
    if (sel) {
      const desc = sel.descripcionNorma ?? '';
      return desc
        ? `${sel.codigoConceptoMgrh} — ${desc}`
        : sel.codigoConceptoMgrh;
    }
    // Homologado por FK pero sin detalle cargado aÃºn (precarga sin resumen).
    return this.mgrhId() !== null ? 'Homologado' : null;
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
