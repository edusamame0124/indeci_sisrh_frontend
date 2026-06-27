import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  sisrhConfirmDialogConfig,
  sisrhFormDialogConfig,
  sisrhLargeDialogConfig,
} from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import {
  hasPlanillaApprove,
  hasPlanillaWrite,
} from '../../../../core/guards/planilla-access.guard';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { ConceptoPlanillaApiService } from '../../services/concepto-planilla-api.service';
import { PlanillaTipoApiService } from '../../services/planilla-tipo-api.service';
import {
  ConceptoWizardDialogComponent,
  type ConceptoWizardDialogData,
} from '../../components/concepto-wizard-dialog/concepto-wizard-dialog.component';
import {
  ConceptoNuevaVersionDialogComponent,
  type ConceptoNuevaVersionDialogData,
} from '../../components/concepto-nueva-version-dialog/concepto-nueva-version-dialog.component';
import {
  ConceptoHistorialDialogComponent,
  type ConceptoHistorialDialogData,
} from '../../components/concepto-historial-dialog/concepto-historial-dialog.component';
import type {
  ConceptoPlanillaEstado,
  ConceptoPlanillaInput,
  ConceptoPlanillaRow,
} from '../../models/concepto-planilla.model';

/** Acciones de transición soportadas (SPEC_CONCEPTOS_PLANILLA §8/D1). */
type ConceptoTransicion = 'enviar-revision' | 'activar' | 'cerrar' | 'anular';

/**
 * Pantalla "Conceptos de Planilla" (SPEC_CONCEPTOS_PLANILLA — dominio Planilla).
 *
 * <p>Lista enriquecida (chips de afectación/régimen/estado) + alta/configuración
 * vía wizard de 5 tabs + transiciones de ciclo de vida por permiso.</p>
 *
 * <p>Ruta: {@code /planilla/conceptos}. Permisos: PLA_WRITE / PLA_APPROVE.</p>
 */
@Component({
  selector: 'app-concepto-planilla-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepto-planilla-page.component.html',
  styleUrl: './concepto-planilla-page.component.css',
})
export class ConceptoPlanillaPageComponent {
  private readonly api = inject(ConceptoPlanillaApiService);
  private readonly planillaTipoApi = inject(PlanillaTipoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly notificacion = inject(NotificacionService);
  private readonly auth = inject(AuthService);

  /**
   * Permisos del módulo (SPEC_CONCEPTOS_PLANILLA §8/D1): el dominio es Planilla.
   * `canWrite` = PLA_WRITE (crear/editar/enviar a revisión);
   * `canApprove` = PLA_APPROVE (activar/cerrar/anular).
   */
  readonly canWrite = computed(() => hasPlanillaWrite([...this.auth.roles()]));
  readonly canApprove = computed(() => hasPlanillaApprove([...this.auth.roles()]));

  /** Cualquier permiso de escritura habilita la columna de acciones. */
  readonly canManage = computed(() => this.canWrite() || this.canApprove());

  /** Columnas base (sin acciones). Tabla enriquecida con chips. */
  private static readonly baseCols = [
    'codigo',
    'nombre',
    'tipoConcepto',
    'afectaciones',
    'regimen',
    'planillas',
    'estado',
  ] as const;

  readonly displayCols = computed(() =>
    this.canManage()
      ? [...ConceptoPlanillaPageComponent.baseCols, 'acciones']
      : [...ConceptoPlanillaPageComponent.baseCols],
  );

  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<readonly ConceptoPlanillaRow[]>([]);
  readonly filterText = signal('');

  /** Catálogo de tipos de planilla (§15) para resolver código → nombre en la lista. */
  private readonly planillaTipos = signal<readonly { codigo: string; nombre: string }[]>([]);
  private readonly planillaTipoMap = computed(
    () => new Map(this.planillaTipos().map((t) => [t.codigo, t.nombre])),
  );

  readonly filtroTipoConcepto = signal<string>('TODOS');
  readonly filtroRegimen = signal<string>('TODOS');
  readonly filtroProrrateable = signal<string>('TODOS');

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly displayed = computed(() => {
    const q = this.filterText().trim().toLowerCase();
    const tipo = this.filtroTipoConcepto();
    const reg = this.filtroRegimen();
    const pro = this.filtroProrrateable();

    return this.rows().filter((r) => {
      if (q) {
        const hay =
          r.codigo.toLowerCase().includes(q) ||
          r.nombre.toLowerCase().includes(q) ||
          r.naturaleza.toLowerCase().includes(q) ||
          (r.codigoMef ?? '').toLowerCase().includes(q) ||
          (r.codigoSisper ?? '').toLowerCase().includes(q) ||
          (r.codigoPlameSunat ?? '').toLowerCase().includes(q) ||
          (r.codigoMcpp ?? '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      if (tipo !== 'TODOS') {
        if ((r.tipoConcepto ?? '') !== tipo) return false;
      }
      if (reg !== 'TODOS') {
        const tokens = (r.regimenAplicable ?? 'TODOS')
          .toUpperCase()
          .split(',')
          .map((t) => t.trim());
        if (!tokens.includes(reg) && !tokens.includes('TODOS')) return false;
      }
      if (pro !== 'TODOS') {
        const isPro = (r.esProrrateable ?? 'N').toUpperCase() === 'S';
        if (pro === 'SI' && !isPro) return false;
        if (pro === 'NO' && isPro) return false;
      }
      return true;
    });
  });

  readonly pagedDisplayed = computed(() => {
    const list = this.displayed();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.reload();
    this.cargarPlanillaTipos();
  }

  /** Carga el catálogo de tipos de planilla para resolver los chips de la lista. */
  private cargarPlanillaTipos(): void {
    this.planillaTipoApi.listar().subscribe({
      next: (list) => this.planillaTipos.set(list),
      error: () => this.planillaTipos.set([]),
    });
  }

  /**
   * Nombres de las planillas asociadas a un concepto (§15). Resuelve cada código
   * con el catálogo cargado; cae al propio código si el catálogo aún no llegó.
   */
  planillaNombres(row: ConceptoPlanillaRow): readonly string[] {
    const map = this.planillaTipoMap();
    return (row.planillaTipos ?? []).map((cod) => map.get(cod) ?? cod);
  }

  labelTipo(t: string): string {
    return t === 'INGRESO' ? 'Ingreso' : 'Descuento';
  }

  /** Label corto del TIPO_CONCEPTO MEF para chip. */
  labelTipoConcepto(t: string | null | undefined): string {
    switch (t) {
      case 'REMUNERATIVO': return 'Remunerativo';
      case 'NO_REMUNERATIVO': return 'No remunerativo';
      case 'DESCUENTO': return 'Descuento';
      case 'APORTE_TRABAJADOR': return 'Aporte trabajador';
      case 'APORTE_EMPLEADOR': return 'Aporte empleador';
      default: return '—';
    }
  }

  /** Severidad de chip para TIPO_CONCEPTO (color institucional). */
  severityTipoConcepto(t: string | null | undefined): 'success' | 'warning' | 'info' | 'neutral' {
    switch (t) {
      case 'REMUNERATIVO': return 'success';
      case 'NO_REMUNERATIVO': return 'info';
      case 'DESCUENTO':
      case 'APORTE_TRABAJADOR':
        return 'warning';
      case 'APORTE_EMPLEADOR':
        return 'info';
      default:
        return 'neutral';
    }
  }

  /** Tokens del régimen aplicable, para renderizar 1 chip por token. */
  regimenTokens(value: string | null | undefined): readonly string[] {
    if (!value || value.trim() === '' || value.toUpperCase() === 'TODOS') {
      return ['TODOS'];
    }
    return value
      .toUpperCase()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  /** S/N → boolean para mostrar chip. */
  isOn(v: string | null | undefined): boolean {
    return (v ?? 'N').toUpperCase() === 'S';
  }

  /**
   * `true` si el concepto está homologado con el catálogo MGRH / MEF
   * (SPEC_HOMOLOGACION_MGRH §D5). Usa el estado derivado por backend; cae a la FK.
   */
  esHomologado(row: ConceptoPlanillaRow): boolean {
    if (row.estadoHomologacionMgrh) return row.estadoHomologacionMgrh === 'HOMOLOGADO';
    return row.catalogoConceptoMgrhId != null;
  }

  /** Estado efectivo: usa `estado`; cae a derivar de `activo` (legacy P1). */
  estadoDe(row: ConceptoPlanillaRow): ConceptoPlanillaEstado {
    if (row.estado) return row.estado;
    return row.activo === 1 ? 'ACTIVO' : 'CERRADO';
  }

  labelEstado(e: ConceptoPlanillaEstado): string {
    switch (e) {
      case 'BORRADOR': return 'Borrador';
      case 'EN_REVISION': return 'En revisión';
      case 'ACTIVO': return 'Activo';
      case 'CERRADO': return 'Cerrado';
      case 'ANULADO': return 'Anulado';
    }
  }

  severityEstado(e: ConceptoPlanillaEstado): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
    switch (e) {
      case 'ACTIVO': return 'success';
      case 'EN_REVISION': return 'info';
      case 'BORRADOR': return 'warning';
      case 'ANULADO': return 'danger';
      case 'CERRADO': return 'neutral';
    }
  }

  // ─────────────── Capacidades de transición por estado/permiso ───────────────

  canEnviarRevision(row: ConceptoPlanillaRow): boolean {
    return this.canWrite() && this.estadoDe(row) === 'BORRADOR';
  }

  canActivar(row: ConceptoPlanillaRow): boolean {
    return this.canApprove() && this.estadoDe(row) === 'EN_REVISION';
  }

  canCerrar(row: ConceptoPlanillaRow): boolean {
    return this.canApprove() && this.estadoDe(row) === 'ACTIVO';
  }

  canAnular(row: ConceptoPlanillaRow): boolean {
    if (!this.canApprove()) return false;
    const e = this.estadoDe(row);
    return e === 'BORRADOR' || e === 'EN_REVISION' || e === 'ACTIVO';
  }

  /**
   * "Crear nueva versión vigente" (P3 · D5): visible con PLA_WRITE y cuando el
   * concepto está ACTIVO (es la vía válida cuando ya fue usado en planilla
   * cerrada, en lugar de editar la versión histórica).
   */
  canCrearVersion(row: ConceptoPlanillaRow): boolean {
    return this.canWrite() && this.estadoDe(row) === 'ACTIVO';
  }

  onFilter(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.filterText.set(v);
    this.pageIndex.set(0);
  }

  setFiltroTipo(v: string): void {
    this.filtroTipoConcepto.set(v);
    this.pageIndex.set(0);
  }

  setFiltroRegimen(v: string): void {
    this.filtroRegimen.set(v);
    this.pageIndex.set(0);
  }

  setFiltroProrrateable(v: string): void {
    this.filtroProrrateable.set(v);
    this.pageIndex.set(0);
  }

  limpiarFiltros(): void {
    this.filterText.set('');
    this.filtroTipoConcepto.set('TODOS');
    this.filtroRegimen.set('TODOS');
    this.filtroProrrateable.set('TODOS');
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  // ─────────────── Wizard de creación / configuración ───────────────

  openCreate(): void {
    if (!this.canWrite()) return;
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'CONCEPTO_CREATE_OPEN' } });
    const data: ConceptoWizardDialogData = {
      title: 'Nuevo concepto de planilla',
      modo: 'crear',
      estadoActual: 'BORRADOR',
      initial: null,
    };
    const ref = this.dialog.open(
      ConceptoWizardDialogComponent,
      // Wizard institucional ancho: fijar width + maxWidth para vencer el
      // maxWidth por defecto de MatDialog (80vw), que lo recortaba/encogía.
      sisrhLargeDialogConfig({
        data,
        width: 'min(960px, 94vw)',
        maxWidth: 'min(960px, 94vw)',
      }),
    );
    ref.afterClosed().subscribe((body: ConceptoPlanillaInput | undefined) => {
      if (!body) return;
      this.api.guardar(body).subscribe({
        next: () => {
          this.notificacion.exito('Concepto registrado correctamente.');
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'CONCEPTO_CREATE_FAIL'),
      });
    });
  }

  openEdit(row: ConceptoPlanillaRow): void {
    if (!this.canWrite()) return;
    this.telemetry.track('CATALOG_ADMIN_UI', {
      extra: { action: 'CONCEPTO_EDIT_OPEN', id: row.id },
    });
    const initial: ConceptoPlanillaInput = {
      codigo: row.codigo,
      nombre: row.nombre,
      tipo: row.tipo,
      naturaleza: row.naturaleza,
      tipoConcepto: row.tipoConcepto ?? null,
      tipoConceptoInterno: row.tipoConceptoInterno ?? null,
      codigoMef: row.codigoMef ?? null,
      codigoSisper: row.codigoSisper ?? null,
      codigoPlameSunat: row.codigoPlameSunat ?? null,
      codigoMcpp: row.codigoMcpp ?? null,
      codigoTributoSunat: row.codigoTributoSunat ?? null,
      rtpsCodigo: row.rtpsCodigo ?? null,
      afectoIr5ta: row.afectoIr5ta ?? null,
      afectoAportePens: row.afectoAportePens ?? null,
      afectoEssalud: row.afectoEssalud ?? null,
      esMuc: row.esMuc ?? null,
      esCuc: row.esCuc ?? null,
      regimenAplicable: row.regimenAplicable ?? null,
      fechaVigIni: row.fechaVigIni ?? null,
      fechaVigFin: row.fechaVigFin ?? null,
      esProrrateable: row.esProrrateable ?? null,
      modoCalculo: row.modoCalculo ?? null,
      // SPEC §15 (Fase A): precarga las planillas asociadas para el multiselect.
      planillaTipos: [...(row.planillaTipos ?? [])],
      // SPEC_HOMOLOGACION_MGRH §C.2: precarga la FK del concepto MGRH homologado.
      catalogoConceptoMgrhId: row.catalogoConceptoMgrhId ?? null,
      observacionHomologacionMgrh: row.observacionHomologacionMgrh ?? null,
      incluyeEnPlanilla: row.incluyeEnPlanilla ?? null,
    };
    const data: ConceptoWizardDialogData = {
      title: `Configurar concepto ${row.codigo} - ${row.nombre}`,
      modo: 'configurar',
      estadoActual: this.estadoDe(row),
      version: row.version ?? null,
      initial,
      // §F: resumen read-only para precargar el detalle de la pestaña sin re-buscar.
      mgrhResumen: row.mgrhResumen ?? null,
    };
    const ref = this.dialog.open(
      ConceptoWizardDialogComponent,
      // Wizard institucional ancho: fijar width + maxWidth para vencer el
      // maxWidth por defecto de MatDialog (80vw), que lo recortaba/encogía.
      sisrhLargeDialogConfig({
        data,
        width: 'min(960px, 94vw)',
        maxWidth: 'min(960px, 94vw)',
      }),
    );
    ref.afterClosed().subscribe((body: ConceptoPlanillaInput | undefined) => {
      if (!body) return;
      this.api.actualizar(row.id, body).subscribe({
        next: () => {
          this.notificacion.exito('Concepto actualizado correctamente.');
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'CONCEPTO_EDIT_FAIL'),
      });
    });
  }

  confirmDelete(row: ConceptoPlanillaRow): void {
    if (!this.canWrite()) return;
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar concepto',
        message: `¿Confirmas la baja del concepto "${row.nombre}" (${row.codigo})?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (!ok) return;
      this.api.eliminar(row.id).subscribe({
        next: () => {
          this.notificacion.exito('Concepto dado de baja correctamente.');
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'CONCEPTO_DELETE_FAIL'),
      });
    });
  }

  // ─────────────── Historial / Versionado (P3 — SPEC §12 · D5) ───────────────

  /**
   * Abre el diálogo "Crear nueva versión vigente". El diálogo devuelve la fecha
   * de inicio de vigencia (ISO); aquí se hace el POST, el toast verde y la
   * recarga. Un 400 (solapamiento de vigencias) se muestra vía mensaje backend.
   */
  openNuevaVersion(row: ConceptoPlanillaRow): void {
    if (!this.canCrearVersion(row)) return;
    this.telemetry.track('CATALOG_ADMIN_UI', {
      extra: { action: 'CONCEPTO_NUEVA_VERSION_OPEN', id: row.id },
    });
    const data: ConceptoNuevaVersionDialogData = {
      codigo: row.codigo,
      nombre: row.nombre,
      versionActual: row.version ?? null,
    };
    const ref = this.dialog.open(
      ConceptoNuevaVersionDialogComponent,
      sisrhFormDialogConfig('md', { data }),
    );
    ref.afterClosed().subscribe((fechaVigIni: string | undefined) => {
      if (!fechaVigIni) return;
      this.api.crearNuevaVersion(row.id, fechaVigIni).subscribe({
        next: () => {
          this.notificacion.exito(
            'Nueva versión creada en borrador. Actívela para que entre en vigencia.',
          );
          this.reload();
        },
        error: (e: unknown) =>
          this.handleWriteError(e, 'CONCEPTO_NUEVA_VERSION_FAIL'),
      });
    });
  }

  /** Abre el diálogo "Historial / Versiones" (solo lectura). */
  openHistorial(row: ConceptoPlanillaRow): void {
    this.telemetry.track('CATALOG_ADMIN_UI', {
      extra: { action: 'CONCEPTO_HISTORIAL_OPEN', id: row.id },
    });
    const data: ConceptoHistorialDialogData = {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
    };
    this.dialog.open(
      ConceptoHistorialDialogComponent,
      sisrhLargeDialogConfig({ data }),
    );
  }

  // ─────────────── Transiciones de estado ───────────────

  enviarRevision(row: ConceptoPlanillaRow): void {
    if (!this.canEnviarRevision(row)) return;
    this.confirmarTransicion(row, 'enviar-revision', {
      titulo: 'Enviar a revisión',
      mensaje: `¿Enviar el concepto "${row.nombre}" (${row.codigo}) a revisión?`,
      confirmLabel: 'Enviar',
      severity: 'info',
      okMsg: 'Concepto enviado a revisión.',
    });
  }

  activar(row: ConceptoPlanillaRow): void {
    if (!this.canActivar(row)) return;
    this.confirmarTransicion(row, 'activar', {
      titulo: 'Activar concepto',
      mensaje: `¿Activar el concepto "${row.nombre}" (${row.codigo})? Quedará disponible para planilla.`,
      confirmLabel: 'Activar',
      severity: 'info',
      okMsg: 'Concepto activado.',
    });
  }

  cerrar(row: ConceptoPlanillaRow): void {
    if (!this.canCerrar(row)) return;
    this.confirmarTransicion(row, 'cerrar', {
      titulo: 'Cerrar concepto',
      mensaje: `¿Cerrar el concepto "${row.nombre}" (${row.codigo})? Dejará de aplicarse hacia adelante.`,
      confirmLabel: 'Cerrar concepto',
      severity: 'danger',
      okMsg: 'Concepto cerrado.',
    });
  }

  anular(row: ConceptoPlanillaRow): void {
    if (!this.canAnular(row)) return;
    this.confirmarTransicion(row, 'anular', {
      titulo: 'Anular concepto',
      mensaje: `¿Anular el concepto "${row.nombre}" (${row.codigo})? Esta acción queda auditada.`,
      confirmLabel: 'Anular',
      severity: 'danger',
      okMsg: 'Concepto anulado.',
    });
  }

  private confirmarTransicion(
    row: ConceptoPlanillaRow,
    accion: ConceptoTransicion,
    opts: {
      titulo: string;
      mensaje: string;
      confirmLabel: string;
      severity: 'info' | 'danger';
      okMsg: string;
    },
  ): void {
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: opts.titulo,
        message: opts.mensaje,
        confirmLabel: opts.confirmLabel,
        cancelLabel: 'Cancelar',
        severity: opts.severity,
      }),
    );
    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (!ok) return;
      this.telemetry.track('CATALOG_ADMIN_UI', {
        extra: { action: `CONCEPTO_${accion.toUpperCase()}`, id: row.id },
      });
      this.transicionApi(row.id, accion).subscribe({
        next: () => {
          this.notificacion.exito(opts.okMsg);
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, `CONCEPTO_${accion.toUpperCase()}_FAIL`),
      });
    });
  }

  private transicionApi(id: number, accion: ConceptoTransicion) {
    switch (accion) {
      case 'enviar-revision': return this.api.enviarRevision(id);
      case 'activar': return this.api.activar(id);
      case 'cerrar': return this.api.cerrar(id);
      case 'anular': return this.api.anular(id);
    }
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listar().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.rows.set([]);
        this.loadError.set(this.resolveLoadError(e));
        this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'CONCEPTO_LOAD_FAIL' } });
      },
    });
  }

  private resolveLoadError(err: unknown): string {
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      return this.errors.translate(err.error.mensaje);
    }
    return this.errors.translate(null);
  }

  /**
   * Manejo de errores de escritura. El PUT puede responder 409
   * (ConceptoEnPlanillaCerradaException): se muestra el mensaje del backend y
   * se sugiere crear una nueva configuración vigente — sin romper la UI.
   */
  private handleWriteError(err: unknown, action: string): void {
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action } });

    if (err instanceof HttpErrorResponse && err.status === 409) {
      const base =
        isErrorResponse(err.error) && err.error.mensaje
          ? this.errors.translate(err.error.mensaje)
          : 'El concepto fue usado en una planilla cerrada y no puede modificarse.';
      this.snack.open(
        `${base} Cree una nueva configuración vigente hacia adelante.`,
        'Entendido',
        { duration: 9000 },
      );
      return;
    }
    if (this.isWriteUnavailable(err)) {
      this.snack.open(this.errors.catalogosEscrituraNoDisponible(), 'Cerrar', { duration: 8000 });
      return;
    }
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      this.snack.open(this.errors.translate(err.error.mensaje), 'Cerrar', { duration: 6000 });
      return;
    }
    this.snack.open(this.errors.translate(null), 'Cerrar', { duration: 6000 });
  }

  private isWriteUnavailable(err: unknown): boolean {
    return err instanceof HttpErrorResponse && [404, 405, 501].includes(err.status);
  }
}
