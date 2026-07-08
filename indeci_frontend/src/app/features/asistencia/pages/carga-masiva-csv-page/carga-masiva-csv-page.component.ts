import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
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
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type {
  AsistenciaImportFilaDetalle,
  AsistenciaImportPreview,
  AsistenciaImportResumen,
  AsistenciaValidacionBatch,
  EstrategiaConflicto,
} from '../../models/asistencia-import.model';

type EstadoFila = AsistenciaImportFilaDetalle['estado'];
type FiltroEstado = 'TODOS' | EstadoFila;

@Component({
  selector: 'app-carga-masiva-csv-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    MapeoMarcadorPanelComponent,
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

  @ViewChild('stepper') private stepper?: MatStepper;

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

  readonly tieneErroresBloqueantes = computed(() => (this.preview()?.filasError ?? 0) > 0);
  readonly tieneConflictos = computed(
    () => this.preview()?.empleados.some((e) => e.conflictoExistente) ?? false,
  );
  readonly estrategiaSeleccionada = computed(() =>
    this.estrategias.find((item) => item.value === this.estrategia()) ?? this.estrategias[0],
  );

  private debounce: ReturnType<typeof setTimeout> | null = null;

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

  generarPreview(): void {
    const periodo = this.periodoSeleccionado();
    const archivo = this.archivo();
    if (periodo == null || archivo == null) {
      this.snack.open('Seleccione periodo y archivo CSV del marcador.', 'Cerrar', { duration: 5000 });
      return;
    }

    this.procesandoPreview.set(true);
    this.importApi.preview(periodo, archivo).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.resetFiltros();
        this.procesandoPreview.set(false);
        this.snack.open(preview.mensaje ?? 'Vista previa generada.', 'Cerrar', { duration: 5000 });
        if (preview.importacionId != null) {
          this.cargarResumen(preview.importacionId);
          this.cargarDetalle();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.procesandoPreview.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  /**
   * F2 (COEN) — tras mapear un nombre a un empleado, regenera la vista previa para
   * que esos días dejen de estar "sin mapeo" y se recalculen con la identidad resuelta.
   */
  onMapeadoAlias(): void {
    this.generarPreview();
  }

  confirmar(): void {
    const preview = this.preview();
    if (preview?.importacionId == null || this.tieneErroresBloqueantes()) {
      return;
    }
    this.confirmando.set(true);
    const motivo = this.motivoRectificacion().trim() || undefined;
    this.importApi.confirmar(preview.importacionId, this.estrategia(), motivo).subscribe({
      next: (resultado) => {
        this.confirmando.set(false);
        this.empleadosProcesados.set(resultado.empleadosDetectados ?? 0);
        this.preview.set({ ...preview, mensaje: resultado.mensaje, estadoImportacion: resultado.estadoImportacion });
        this.snack.open(resultado.mensaje ?? 'Importación confirmada.', 'Cerrar', { duration: 6000 });
        this.cargarResumen(preview.importacionId!);
      },
      error: (err: HttpErrorResponse) => {
        this.confirmando.set(false);
        this.onHttpSnack(err);
      },
    });
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
    this.importApi.validarCabeceras(id).subscribe({
      next: (resultado) => {
        this.validandoCabeceras.set(false);
        this.validacionResultado.set(resultado);
        this.snack.open(
          `Asistencia validada: ${resultado.validadas} cabecera(s) habilitadas para planilla.`,
          'Cerrar',
          { duration: 6000 },
        );
      },
      error: (err: HttpErrorResponse) => {
        this.validandoCabeceras.set(false);
        this.onHttpSnack(err);
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
