import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../services/movimiento-planilla-api.service';
import { ExportPlanillaApiService } from '../../services/export-planilla-api.service';
import { PlanillaLoteApiService } from '../../services/planilla-lote-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import type { ExportHistorialRow } from '../../models/export-historial.model';
import type { PlanillaLoteDashboardRow } from '../../models/planilla-lote.model';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { PeriodoEstadoBadgeComponent } from '../../components/periodo-estado-badge/periodo-estado-badge.component';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';

/** Estados válidos para `cambiarEstado` (Spec 009 / T155 — FR-P4). */
export const ESTADOS_MOVIMIENTO = ['PENDIENTE', 'PROCESADO', 'OBSERVADO', 'ANULADO'] as const;
export type EstadoMovimiento = (typeof ESTADOS_MOVIMIENTO)[number];

/** Filtro de semáforo ESTADO_NETO (Spec 010 §12.2 PANTALLA-01). */
export type FiltroSemaforo = 'TODOS' | 'BIEN' | 'NETO_NO_VA' | 'SIN_VALIDAR';

/**
 * Listado de movimientos (cabeceras) de planilla por periodo (Spec 009 / T155).
 * - Selector de periodo en el header (default: primer ABIERTO, o más reciente).
 * - MatTable paginada local con totales por fila.
 * - Acción "cambiar estado" via `MatMenu` con las transiciones distintas al estado actual.
 * - Acción "eliminar" con `ConfirmDialogComponent`.
 */
@Component({
  selector: 'app-movimientos-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTabsModule,
    MatTooltipModule,
    PeriodoEstadoBadgeComponent,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './movimientos-page.component.html',
  styleUrl: './movimientos-page.component.css',
})
export class MovimientosPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly exportApi = inject(ExportPlanillaApiService);
  private readonly loteApi = inject(PlanillaLoteApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnsLotes = [
    'descripcion',
    'regimen',
    'empleados',
    'totalNeto',
    'estado',
    'acciones',
  ] as const;

  readonly columns = [
    'empleado',
    'empleadoDni',
    'regimenLaboral',
    'totalIngresos',
    'totalDescuentos',
    'netoPagar',
    'semaforo',
    'estado',
    'observacion',
    'acciones',
  ] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly estadosDisponibles = ESTADOS_MOVIMIENTO;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  
  readonly lotes = signal<readonly PlanillaLoteDashboardRow[]>([]);
  readonly loteSeleccionado = signal<PlanillaLoteDashboardRow | null>(null);
  readonly selectedTabIndex = signal(0);
  readonly lotesLoading = signal(false);

  readonly rows = signal<readonly MovimientoPlanillaRow[]>([]);
  readonly loading = signal(true);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly filtroSemaforo = signal<FiltroSemaforo>('TODOS');
  readonly descargando = signal(false);
  readonly descargandoCas = signal(false);
  readonly historial = signal<readonly ExportHistorialRow[]>([]);
  readonly historialVisible = signal(false);

  readonly periodoActivo = computed(() => {
    const sel = this.periodoSeleccionado();
    if (sel == null) return null;
    return this.periodos().find((p) => p.periodo === sel) ?? null;
  });

  /** Conteo del semáforo ESTADO_NETO sobre todo el periodo (§12.2 PANTALLA-01). */
  readonly resumenSemaforo = computed(() => {
    let verde = 0;
    let rojo = 0;
    let neutro = 0;
    for (const r of this.rows()) {
      if (r.estadoNeto === 'BIEN') verde++;
      else if (r.estadoNeto === 'NETO_NO_VA') rojo++;
      else neutro++;
    }
    return { verde, rojo, neutro };
  });

  /** Filas tras aplicar el filtro de semáforo Y el Lote seleccionado. */
  readonly rowsFiltradas = computed(() => {
    const f = this.filtroSemaforo();
    const lote = this.loteSeleccionado();
    let list = this.rows();
    
    if (lote) {
      list = list.filter((r) => r.loteId === lote.id);
    }
    
    if (f === 'TODOS') return list;
    if (f === 'SIN_VALIDAR') return list.filter((r) => r.estadoNeto == null);
    return list.filter((r) => r.estadoNeto === f);
  });

  readonly pagedRows = computed(() => {
    const list = this.rowsFiltradas();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  /** Semáforo de una fila: 'ok' (BIEN) | 'rojo' (NETO_NO_VA) | 'neutro' (sin validar). */
  semaforoDe(row: MovimientoPlanillaRow): 'ok' | 'rojo' | 'neutro' {
    if (row.estadoNeto === 'BIEN') return 'ok';
    if (row.estadoNeto === 'NETO_NO_VA') return 'rojo';
    return 'neutro';
  }

  onFiltroSemaforo(valor: FiltroSemaforo): void {
    this.filtroSemaforo.set(valor);
    this.pageIndex.set(0);
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  empleadoNombre(row: MovimientoPlanillaRow): string {
    return row.empleadoNombre?.trim() || `Empleado #${row.empleadoId}`;
  }

  empleadoDni(row: MovimientoPlanillaRow): string {
    return row.empleadoDni?.trim() || 'Sin DNI';
  }

  regimenLaboral(row: MovimientoPlanillaRow): string {
    const codigo = row.regimenLaboralCodigo?.trim();
    const nombre = row.regimenLaboralNombre?.trim();
    if (codigo && nombre) return `${codigo} - ${nombre}`;
    return codigo || nombre || 'Sin régimen';
  }

  nombreRegimen(codigo: string | null | undefined): string {
    switch(codigo?.trim()) {
      case '1057': return 'CAS';
      case '30057': return 'SERVIR';
      case '276': return 'D.L. 276';
      default: return codigo || '—';
    }
  }

  /** Estados distintos al actual (para el menú de transición). */
  estadosOtros(row: MovimientoPlanillaRow): readonly EstadoMovimiento[] {
    return this.estadosDisponibles.filter((e) => e !== row.estado);
  }

  readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.loading.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const ordenados = [...rows].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        
        const qParams = this.route.snapshot.queryParams;
        const paramPeriodo = qParams['periodo'];
        const paramLoteId = Number(qParams['loteId']);

        const inicial = paramPeriodo 
          ? ordenados.find((p) => p.periodo === paramPeriodo) ?? ordenados[0]
          : ordenados.find((p) => p.estado === 'ABIERTO') ?? ordenados[0];

        if (inicial) {
          this.periodoSeleccionado.set(inicial.periodo);
          this.loading.set(false);
          this.cargarMovimientos(inicial.periodo);
          this.cargarHistorial(inicial.periodo);
          
          if (paramLoteId) {
             // Mock the selected lote to filter rows immediately without loading all lotes
             this.loteSeleccionado.set({ id: paramLoteId } as PlanillaLoteDashboardRow);
             this.selectedTabIndex.set(1);
          }
        } else {
          this.loading.set(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.loteSeleccionado.set(null);
    this.selectedTabIndex.set(0);
    this.pageIndex.set(0);
  }

  verDashboard(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return;
    this.cargarLotes(periodo);
    this.cargarMovimientos(periodo);
    this.cargarHistorial(periodo);
  }

  seleccionarLote(lote: PlanillaLoteDashboardRow): void {
    this.loteSeleccionado.set(lote);
    this.pageIndex.set(0);
    this.selectedTabIndex.set(1);
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    if (index === 0) {
      // Al volver al tab de Lotes, limpiamos el lote seleccionado
      this.loteSeleccionado.set(null);
      this.pageIndex.set(0);
    }
  }

  descargarXlsx(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo || this.descargando()) return;
    this.descargando.set(true);
    this.exportApi.descargarXlsx(periodo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planilla_consolidada_${periodo}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.descargando.set(false);
        this.snack.open('XLSX descargado correctamente.', 'Cerrar', { duration: 4000 });
        this.cargarHistorial(periodo);
      },
      error: () => {
        this.descargando.set(false);
        this.snack.open('Error al generar el archivo XLSX.', 'Cerrar', { duration: 6000 });
      },
    });
  }

  /** P0 — Descarga la Planilla CAS Consolidada (19 bloques). */
  descargarCasConsolidada(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo || this.descargandoCas()) return;
    this.descargandoCas.set(true);
    this.exportApi.descargarCasConsolidada(periodo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planilla-cas-consolidada-${periodo}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.descargandoCas.set(false);
        this.snack.open('Planilla CAS Consolidada descargada.', 'Cerrar', { duration: 4000 });
        this.cargarHistorial(periodo);
      },
      error: () => {
        this.descargandoCas.set(false);
        this.snack.open(
          'No se pudo generar la Planilla CAS Consolidada. Verifica tus permisos.',
          'Cerrar',
          { duration: 6000 },
        );
      },
    });
  }

  toggleHistorial(): void {
    this.historialVisible.set(!this.historialVisible());
  }

  fmtFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  cambiarEstado(row: MovimientoPlanillaRow, nuevoEstado: EstadoMovimiento): void {
    this.movimientoApi.cambiarEstado(row.id, nuevoEstado).subscribe({
      next: () => {
        this.snack.open(`Movimiento actualizado a ${nuevoEstado}.`, 'Cerrar', { duration: 4000 });
        const periodo = this.periodoSeleccionado();
        if (periodo) this.cargarMovimientos(periodo);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  confirmEliminar(row: MovimientoPlanillaRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar movimiento',
        message: `Se eliminará el movimiento de ${this.empleadoNombre(row)} en el periodo ${row.periodo}. ¿Continuar?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private eliminar(id: number): void {
    this.movimientoApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Movimiento eliminado.', 'Cerrar', { duration: 4000 });
        const periodo = this.periodoSeleccionado();
        if (periodo) this.cargarMovimientos(periodo);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }



  private cargarHistorial(periodo: string): void {
    this.exportApi.historial(periodo).subscribe({
      next: (rows) => this.historial.set(rows),
      error: () => this.historial.set([]),
    });
  }

  private cargarLotes(periodo: string): void {
    this.lotesLoading.set(true);
    this.loteApi.obtenerLotesDashboard(periodo).subscribe({
      next: (rows) => {
        this.lotes.set(rows);
        this.lotesLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.lotesLoading.set(false);
        this.lotes.set([]);
        this.onHttpSnack(err);
      }
    });
  }

  private cargarMovimientos(periodo: string): void {
    this.tableLoading.set(true);
    this.movimientoApi.listarPeriodo(periodo).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.clampPageIndex(rows.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.rows.set([]);
        this.onHttpSnack(err);
      },
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
