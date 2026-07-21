import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, takeWhile, timer } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import { MapeoMarcadorPanelComponent } from './components/mapeo-marcador-panel/mapeo-marcador-panel.component';
import {
  CalculoProgresoCircularComponent,
  type EstadoProgresoCircular,
} from '../../components/calculo-progreso-circular/calculo-progreso-circular.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type {
  AsistenciaImportFilaDetalle,
  AsistenciaImportJob,
  AsistenciaImportPreview,
  AsistenciaImportResumen,
  AsistenciaValidacionBatch,
  EstrategiaConflicto,
} from '../../models/asistencia-import.model';

/** Máquina de estados de la UI de validación (Opción B). */
type EstadoValidacion = 'IDLE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';

type EstadoFila = AsistenciaImportFilaDetalle['estado'];
type FiltroEstado = 'TODOS' | EstadoFila;

@Component({
  selector: 'app-carga-masiva-csv-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    MapeoMarcadorPanelComponent,
    CalculoProgresoCircularComponent,
  ],
  templateUrl: './carga-masiva-csv-page.component.html',
  styleUrl: './carga-masiva-csv-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaMasivaCsvPageComponent implements OnInit, OnDestroy {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly importApi = inject(AsistenciaImportApiService);
  private readonly tabs = inject(AsistenciaTabService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('stepper') private stepper?: MatStepper;

  // ===== Opción B — validación asíncrona con progreso real =====
  /** Intervalo de polling (ms). */
  private static readonly POLL_MS = 700;
  readonly estadoValidacion = signal<EstadoValidacion>('IDLE');
  readonly progresoValidacion = signal(0);
  readonly faseValidacion = signal('');
  readonly errorValidacion = signal<string | null>(null);

  // ===== Opción B — confirmación asíncrona con progreso real (mismo patrón que validar) =====
  readonly estadoConfirmacion = signal<EstadoValidacion>('IDLE');
  readonly progresoConfirmacion = signal(0);
  readonly faseConfirmacion = signal('');
  readonly errorConfirmacion = signal<string | null>(null);

  // ===== Opción B — "Ejecutar cálculo" asíncrono con indicador CIRCULAR =====
  readonly estadoCalculo = signal<EstadoProgresoCircular | 'IDLE'>('IDLE');
  readonly progresoCalculo = signal(0);
  readonly faseCalculo = signal('');
  readonly errorCalculo = signal<string | null>(null);
  /** Estado del círculo para el input (IDLE se mapea a PROCESANDO; solo se muestra si !== IDLE). */
  readonly estadoCalculoView = computed<EstadoProgresoCircular>(() => {
    const e = this.estadoCalculo();
    return e === 'IDLE' ? 'PROCESANDO' : e;
  });

  /** Resumen por empleado (paso "Resumen"). */
  readonly columnasResumen = ['empleado', 'dias', 'tardanza', 'descuento', 'estado', 'conflicto'] as const;

  /** Detalle server-side por empleado y día (paso "Validar") — 24 columnas. */
  readonly columnasDetalle = [
    'estado', 'dni', 'empleadoSistema', 'nombreCsv', 'fecha', 'dia',
    'entradaProg', 'salidaProg', 'marca1', 'marca2', 'marca3', 'marca4',
    'tardanza', 'refrigerio', 'excesoRefrig', 'tiempoRefrig', 'tiempoAntesSal',
    'horasTrab', 'he25', 'he35', 'he100', 'heTotal', 'observaciones', 'mensaje',
  ] as const;

  readonly estadosFiltro: readonly { value: FiltroEstado; label: string }[] = [
    { value: 'TODOS', label: 'Todos los estados' },
    { value: 'VALIDA', label: 'Válidas' },
    { value: 'WARN', label: 'Con advertencia' },
    { value: 'OBSERVADA', label: 'Observadas' },
    { value: 'ERROR', label: 'Con error' },
  ];

  readonly estrategias: readonly { value: EstrategiaConflicto; label: string; hint: string }[] = [
    {
      value: 'OMITIR_EXISTENTES',
      label: 'Omitir existentes',
      hint: 'No modifica empleados con asistencia registrada en el periodo.',
    },
    {
      value: 'REEMPLAZAR_EMPLEADOS_ARCHIVO',
      label: 'Reemplazar empleados del archivo',
      hint: 'Actualiza solo los empleados detectados en el CSV.',
    },
    {
      value: 'REEMPLAZAR_PERIODO_COMPLETO',
      label: 'Reemplazar periodo completo',
      hint: 'Reemplaza la asistencia del periodo para todos los empleados validos del archivo.',
    },
    {
      value: 'CANCELAR',
      label: 'Cancelar si hay conflictos',
      hint: 'Detiene la confirmación cuando existe asistencia previa.',
    },
  ];

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly archivo = signal<File | null>(null);
  readonly preview = signal<AsistenciaImportPreview | null>(null);
  readonly estrategia = signal<EstrategiaConflicto>('OMITIR_EXISTENTES');

  // ---- Detalle server-side ----
  readonly resumen = signal<AsistenciaImportResumen | null>(null);
  readonly detalleRows = signal<readonly AsistenciaImportFilaDetalle[]>([]);
  readonly detalleTotal = signal(0);
  readonly detallePage = signal(0);
  readonly detalleSize = signal(25);
  readonly filtroDni = signal('');
  readonly filtroNombre = signal('');
  readonly filtroEstado = signal<FiltroEstado>('TODOS');
  readonly soloErrores = signal(false);
  readonly cargandoDetalle = signal(false);

  readonly loadingPeriodos = signal(true);
  readonly procesandoPreview = signal(false);
  readonly confirmando = signal(false);
  readonly exportando = signal(false);

  // ---- F5: aceptación de observadas / rectificación / anulación ----
  readonly motivoAceptacion = signal('');
  readonly aceptandoObservadas = signal(false);
  readonly motivoRectificacion = signal('');
  readonly motivoAnulacion = signal('');
  readonly anulando = signal(false);

  // ---- F5: estado post-confirmación + validación de cabeceras ----
  readonly validandoCabeceras = signal(false);
  readonly validacionResultado = signal<AsistenciaValidacionBatch | null>(null);
  /** Empleados efectivamente migrados en la confirmación (null = aún no confirmado). */
  readonly empleadosProcesados = signal<number | null>(null);

  readonly hayObservadas = computed(() => (this.resumen()?.filasObservadas ?? 0) > 0);

  /** La importación ya fue confirmada (CONFIRMADA o PARCIAL). */
  readonly confirmado = computed(() => {
    const estado = this.preview()?.estadoImportacion;
    return estado === 'CONFIRMADA' || estado === 'PARCIAL';
  });

  /** Confirmada pero sin migrar ningún empleado (todos omitidos/bloqueados). */
  readonly confirmadoSinEfecto = computed(() => this.empleadosProcesados() === 0);

  /** Hay filas exportables (error / observada / advertencia). */
  readonly hayExportables = computed(() => {
    const p = this.preview();
    if (p == null) {
      return false;
    }
    return (p.filasError + p.filasObservadas + p.filasAdvertencia) > 0;
  });

  /** Hay filas con error en la vista previa. Ya NO bloquea: se omiten al confirmar. */
  readonly hayFilasError = computed(() => (this.preview()?.filasError ?? 0) > 0);
  /** Reconocimiento explícito de que las filas con error se omitirán (checkbox). */
  readonly aceptaOmitirErrores = signal(false);
  /** Confirmar habilitado: hay preview, no está confirmando y —si hay errores— se reconoció omitirlos. */
  readonly puedeConfirmar = computed(
    () =>
      this.preview() != null &&
      !this.confirmando() &&
      (!this.hayFilasError() || this.aceptaOmitirErrores()),
  );
  readonly tieneConflictos = computed(
    () => this.preview()?.empleados.some((e) => e.conflictoExistente) ?? false,
  );
  readonly estrategiaSeleccionada = computed(() =>
    this.estrategias.find((item) => item.value === this.estrategia()) ?? this.estrategias[0],
  );

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // B — Si el período ya tiene asistencia (conflicto), el flujo natural es CORREGIR y
    // actualizar: se propone "Reemplazar empleados del archivo" por defecto (en vez de
    // OMITIR_EXISTENTES, que ignoraría a los ya cargados). El usuario puede cambiarla.
    effect(() => {
      if (this.tieneConflictos() && this.estrategia() === 'OMITIR_EXISTENTES') {
        this.estrategia.set('REEMPLAZAR_EMPLEADOS_ARCHIVO');
      }
    });
  }

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  ngOnDestroy(): void {
    if (this.debounce != null) {
      clearTimeout(this.debounce);
    }
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.limpiarPreview();
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.limpiarPreview();
  }

  /**
   * Opción B — Validación ASÍNCRONA con progreso real. Dispara el job en el backend y hace
   * polling declarativo (RxJS) del progreso hasta COMPLETADO/ERROR. La suscripción se limpia
   * sola si el usuario abandona la pantalla (takeUntilDestroyed).
   */
  generarPreview(): void {
    const periodo = this.periodoSeleccionado();
    const archivo = this.archivo();
    if (periodo == null || archivo == null) {
      this.snack.open('Seleccione periodo y archivo CSV del marcador.', 'Cerrar', { duration: 5000 });
      return;
    }

    this.iniciarValidacion();

    this.importApi
      .previewAsync(periodo, archivo)
      .pipe(
        // 1) recibe el jobId → 2) hace polling cada POLL_MS consultando el estado del job.
        switchMap(({ jobId }) =>
          timer(0, CargaMasivaCsvPageComponent.POLL_MS).pipe(
            switchMap(() => this.importApi.jobEstado(jobId)),
            // emite hasta (e incluyendo) el estado terminal COMPLETADO/ERROR y completa.
            takeWhile((job) => job.estado === 'EN_COLA' || job.estado === 'PROCESANDO', true),
          ),
        ),
        takeUntilDestroyed(this.destroyRef), // sin fugas: se corta si el componente se destruye
        finalize(() => this.procesandoPreview.set(false)),
      )
      .subscribe({
        next: (job) => this.onJobUpdate(job),
        error: (err: HttpErrorResponse) => this.onValidacionError(err),
      });
  }

  /** Reinicia la máquina de estados de la barra al iniciar una validación. */
  private iniciarValidacion(): void {
    this.preview.set(null);
    this.estadoValidacion.set('PROCESANDO');
    this.progresoValidacion.set(0);
    this.faseValidacion.set('Iniciando validación…');
    this.errorValidacion.set(null);
    this.procesandoPreview.set(true);
  }

  /** Aplica cada emisión del polling a la UI (barra + estado). */
  private onJobUpdate(job: AsistenciaImportJob): void {
    this.progresoValidacion.set(job.porcentaje);
    this.faseValidacion.set(job.fase);

    if (job.estado === 'COMPLETADO' && job.resultado) {
      this.progresoValidacion.set(100);
      this.estadoValidacion.set('COMPLETADO'); // el 100% PERSISTE (no desaparece)
      this.aplicarPreview(job.resultado as AsistenciaImportPreview);
    } else if (job.estado === 'ERROR') {
      this.estadoValidacion.set('ERROR');
      this.errorValidacion.set(job.error ?? 'La validación falló.');
    }
  }

  /** Carga en memoria el preview validado y prepara los pasos siguientes. */
  private aplicarPreview(preview: AsistenciaImportPreview): void {
    this.preview.set(preview);
    this.aceptaOmitirErrores.set(false);
    this.resetFiltros();
    if (preview.importacionId != null) {
      this.cargarResumen(preview.importacionId);
      this.cargarDetalle();
    }
  }

  /** Falla del job o de red HTTP → estado de error visible en la barra. */
  private onValidacionError(err: HttpErrorResponse): void {
    this.procesandoPreview.set(false);
    this.estadoValidacion.set('ERROR');
    const body = err?.error;
    this.errorValidacion.set(
      isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
    );
  }

  /**
   * F2 (COEN) — tras mapear un nombre a un empleado, regenera la vista previa para
   * que esos días dejen de estar "sin mapeo" y se recalculen con la identidad resuelta.
   */
  onMapeadoAlias(): void {
    this.generarPreview();
  }

  /**
   * Opción B — Confirmación ASÍNCRONA con progreso real. Mismo patrón reactivo que la validación:
   * dispara el job y hace polling declarativo hasta COMPLETADO/ERROR. Safe-submit: {@code confirmando}
   * deshabilita el botón al instante; en ERROR se rehabilita para reintentar (finalize).
   */
  confirmar(): void {
    const preview = this.preview();
    if (preview?.importacionId == null || !this.puedeConfirmar()) {
      return;
    }
    const motivo = this.motivoRectificacion().trim() || undefined;
    this.iniciarConfirmacion();

    this.importApi
      .confirmarAsync(preview.importacionId, this.estrategia(), motivo)
      .pipe(
        switchMap(({ jobId }) =>
          timer(0, CargaMasivaCsvPageComponent.POLL_MS).pipe(
            switchMap(() => this.importApi.jobEstado(jobId)),
            takeWhile((job) => job.estado === 'EN_COLA' || job.estado === 'PROCESANDO', true),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.confirmando.set(false)), // rehabilita el botón (éxito o error)
      )
      .subscribe({
        next: (job) => this.onConfirmJobUpdate(job, preview),
        error: (err: HttpErrorResponse) => this.onConfirmError(err),
      });
  }

  private iniciarConfirmacion(): void {
    this.estadoConfirmacion.set('PROCESANDO');
    this.progresoConfirmacion.set(0);
    this.faseConfirmacion.set('Iniciando confirmación…');
    this.errorConfirmacion.set(null);
    this.confirmando.set(true); // safe-submit: deshabilita el botón de inmediato
  }

  private onConfirmJobUpdate(job: AsistenciaImportJob, preview: AsistenciaImportPreview): void {
    this.progresoConfirmacion.set(job.porcentaje);
    this.faseConfirmacion.set(job.fase);

    if (job.estado === 'COMPLETADO' && job.resultado) {
      const resultado = job.resultado as AsistenciaImportPreview;
      this.progresoConfirmacion.set(100);
      this.estadoConfirmacion.set('COMPLETADO'); // barra verde persistente
      this.empleadosProcesados.set(resultado.empleadosDetectados ?? 0);
      this.preview.set({
        ...preview,
        mensaje: resultado.mensaje,
        estadoImportacion: resultado.estadoImportacion,
      });
      if (preview.importacionId != null) {
        this.cargarResumen(preview.importacionId);
      }
    } else if (job.estado === 'ERROR') {
      this.estadoConfirmacion.set('ERROR');
      this.errorConfirmacion.set(job.error ?? 'La confirmación falló.');
    }
  }

  private onConfirmError(err: HttpErrorResponse): void {
    this.confirmando.set(false); // rehabilita el botón para reintentar
    this.estadoConfirmacion.set('ERROR');
    const body = err?.error;
    this.errorConfirmacion.set(
      isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
    );
  }

  /**
   * Promueve las cabeceras de esta importación a estado VALIDADA, que es el único
   * estado que el motor de planilla (M05) consume. CTA del cierre del flujo.
   */
  validarCabeceras(): void {
    const id = this.preview()?.importacionId;
    if (id == null) {
      return;
    }
    this.validandoCabeceras.set(true);
    this.estadoCalculo.set('PROCESANDO');
    this.progresoCalculo.set(0);
    this.faseCalculo.set('Iniciando cálculo…');
    this.errorCalculo.set(null);

    this.importApi
      .validarCabecerasAsync(id)
      .pipe(
        switchMap(({ jobId }) =>
          timer(0, CargaMasivaCsvPageComponent.POLL_MS).pipe(
            switchMap(() => this.importApi.jobEstado(jobId)),
            takeWhile((job) => job.estado === 'EN_COLA' || job.estado === 'PROCESANDO', true),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.validandoCabeceras.set(false)),
      )
      .subscribe({
        next: (job) => {
          this.progresoCalculo.set(job.porcentaje);
          this.faseCalculo.set(job.fase);
          if (job.estado === 'COMPLETADO') {
            this.progresoCalculo.set(100);
            this.estadoCalculo.set('COMPLETADO'); // círculo verde persistente
            const resultado = job.resultado as AsistenciaValidacionBatch | null;
            if (resultado) {
              this.validacionResultado.set(resultado);
              this.snack.open(
                `Asistencia validada: ${resultado.validadas} cabecera(s) habilitadas para planilla.`,
                'Cerrar',
                { duration: 6000 },
              );
            }
          } else if (job.estado === 'ERROR') {
            this.estadoCalculo.set('ERROR');
            this.errorCalculo.set(job.error ?? 'El cálculo falló.');
          }
        },
        error: (err: HttpErrorResponse) => {
          this.validandoCabeceras.set(false);
          this.estadoCalculo.set('ERROR');
          const body = err?.error;
          this.errorCalculo.set(
            isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
          );
        },
      });
  }

  /** P3 — acepta todas las filas observadas con el motivo indicado. */
  aceptarObservadas(): void {
    const id = this.preview()?.importacionId;
    if (id == null) {
      return;
    }
    const motivo = this.motivoAceptacion().trim();
    if (motivo.length === 0) {
      this.snack.open('Indique el motivo de aceptación de las filas observadas.', 'Cerrar', { duration: 5000 });
      return;
    }
    this.aceptandoObservadas.set(true);
    this.importApi.aceptarObservadas(id, [], motivo).subscribe({
      next: (aceptadas) => {
        this.aceptandoObservadas.set(false);
        this.motivoAceptacion.set('');
        this.snack.open(`${aceptadas} fila(s) observada(s) aceptada(s).`, 'Cerrar', { duration: 5000 });
        this.cargarResumen(id);
        this.cargarDetalle();
      },
      error: (err: HttpErrorResponse) => {
        this.aceptandoObservadas.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  /** P4 — anula la importación con motivo. */
  anular(): void {
    const preview = this.preview();
    if (preview?.importacionId == null) {
      return;
    }
    const id = preview.importacionId;
    const motivo = this.motivoAnulacion().trim();
    if (motivo.length === 0) {
      this.snack.open('Indique el motivo de la anulación.', 'Cerrar', { duration: 5000 });
      return;
    }
    this.anulando.set(true);
    this.importApi.anular(id, motivo).subscribe({
      next: (res) => {
        this.anulando.set(false);
        this.motivoAnulacion.set('');
        this.preview.set({ ...preview, mensaje: res.mensaje, estadoImportacion: res.estadoImportacion });
        this.snack.open(res.mensaje ?? 'Importación anulada.', 'Cerrar', { duration: 6000 });
        this.cargarResumen(id);
      },
      error: (err: HttpErrorResponse) => {
        this.anulando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Filtros + paginación server-side ============

  onFiltroTextoChange(): void {
    this.detallePage.set(0);
    this.recargarConDebounce();
  }

  onFiltroEstadoChange(valor: FiltroEstado): void {
    this.filtroEstado.set(valor);
    this.detallePage.set(0);
    this.cargarDetalle();
  }

  onSoloErroresChange(valor: boolean): void {
    this.soloErrores.set(valor);
    this.detallePage.set(0);
    this.cargarDetalle();
  }

  onDetallePage(event: PageEvent): void {
    this.detallePage.set(event.pageIndex);
    this.detalleSize.set(event.pageSize);
    this.cargarDetalle();
  }

  private recargarConDebounce(): void {
    if (this.debounce != null) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => this.cargarDetalle(), 300);
  }

  private cargarDetalle(): void {
    const id = this.preview()?.importacionId;
    if (id == null) {
      return;
    }
    const estado = this.filtroEstado();
    this.cargandoDetalle.set(true);
    this.importApi
      .detalles(
        id,
        {
          dni: this.filtroDni(),
          nombre: this.filtroNombre(),
          estado: estado === 'TODOS' ? undefined : estado,
          soloErrores: this.soloErrores(),
        },
        this.detallePage(),
        this.detalleSize(),
      )
      .subscribe({
        next: (page) => {
          this.detalleRows.set(page.content);
          this.detalleTotal.set(page.totalElements);
          this.cargandoDetalle.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoDetalle.set(false);
          this.detalleRows.set([]);
          this.detalleTotal.set(0);
          this.onHttpSnack(err);
        },
      });
  }

  private cargarResumen(importacionId: number): void {
    this.importApi.resumen(importacionId).subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: () => this.resumen.set(null),
    });
  }

  exportarErrores(): void {
    const id = this.preview()?.importacionId;
    if (id == null) {
      return;
    }
    this.exportando.set(true);
    this.importApi.descargarErroresXlsx(id).subscribe({
      next: (blob) => {
        this.descargarBlob(blob, `asistencia-importacion-${id}-errores.xlsx`);
        this.exportando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.exportando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private descargarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Acción de cierre: abre "Asistencia por empleado" con el periodo preseleccionado. Si la
   * importación cargó un único empleado, también lo preselecciona; con varios, el
   * usuario elige en el dropdown (la vista completa por empleado está en "Resumen"/"Historial").
   */
  verAsistencia(): void {
    const periodo = this.periodoSeleccionado();
    const empleados = this.preview()?.empleados ?? [];
    const unico = empleados.length === 1 ? empleados[0].empleadoId : null;
    this.tabs.irACargaIndividual(periodo, unico);
  }

  /** Abre la consulta diaria con fecha del periodo (o hoy) y DNI si hubo un solo empleado. */
  verRegistroDiario(): void {
    const periodo = this.periodoSeleccionado();
    const empleados = this.preview()?.empleados ?? [];
    const dni = empleados.length === 1 ? empleados[0].dni : null;
    this.tabs.irAConsultaDiaria(this.fechaReferenciaConsulta(periodo), dni);
  }

  private fechaReferenciaConsulta(periodo: string | null): string {
    const hoy = new Date();
    const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    if (!periodo) return hoyIso;
    const parts = periodo.split('-');
    if (parts.length < 2) return hoyIso;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(y) || Number.isNaN(m)) return hoyIso;
    if (hoy.getFullYear() === y && hoy.getMonth() + 1 === m) return hoyIso;
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  /** Acción de cierre: reinicia el asistente para una nueva importación. */
  nuevaImportacion(): void {
    this.archivo.set(null);
    this.limpiarPreview();
    this.stepper?.reset();
  }

  // ============ Formato ============

  /** Pluralización correcta: "1 empleado cargado" / "3 empleados cargados". */
  plural(n: number | null | undefined, singular: string, plural: string): string {
    const cantidad = n ?? 0;
    return `${cantidad} ${cantidad === 1 ? singular : plural}`;
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  /** Minutos → "Xh Ym" (o "—" si nulo/cero). */
  fmtMin(value: number | null | undefined): string {
    if (value == null || value === 0) {
      return '—';
    }
    const h = Math.trunc(value / 60);
    const m = value % 60;
    if (h === 0) {
      return `${m}m`;
    }
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  fmtBytes(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    if (value < 1024) {
      return `${value} B`;
    }
    const kb = value / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  badgeLabel(estado: EstadoFila): string {
    switch (estado) {
      case 'VALIDA':
        return 'Válida';
      case 'WARN':
        return 'Advertencia';
      case 'OBSERVADA':
        return 'Observada';
      case 'ERROR':
        return 'Error';
    }
  }

  private cargarPeriodos(): void {
    this.loadingPeriodos.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const abiertos = rows
          .filter((p) => p.estado === 'ABIERTO')
          .sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(abiertos);
        this.periodoSeleccionado.set(abiertos[0]?.periodo ?? null);
        this.loadingPeriodos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPeriodos.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private limpiarPreview(): void {
    this.preview.set(null);
    this.resumen.set(null);
    this.detalleRows.set([]);
    this.detalleTotal.set(0);
    this.validacionResultado.set(null);
    this.empleadosProcesados.set(null);
    this.motivoRectificacion.set('');
    this.motivoAnulacion.set('');
    this.aceptaOmitirErrores.set(false);
    // Reinicia las barras de validación y confirmación (nuevo archivo/período).
    this.estadoValidacion.set('IDLE');
    this.progresoValidacion.set(0);
    this.faseValidacion.set('');
    this.errorValidacion.set(null);
    this.estadoConfirmacion.set('IDLE');
    this.progresoConfirmacion.set(0);
    this.faseConfirmacion.set('');
    this.errorConfirmacion.set(null);
    this.resetFiltros();
  }

  private resetFiltros(): void {
    this.filtroDni.set('');
    this.filtroNombre.set('');
    this.filtroEstado.set('TODOS');
    this.soloErrores.set(false);
    this.detallePage.set(0);
    this.detalleSize.set(25);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
