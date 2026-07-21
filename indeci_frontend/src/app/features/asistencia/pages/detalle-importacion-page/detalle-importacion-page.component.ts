import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { AsistenciaApiService } from '../../services/asistencia-api.service';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import type { AsistenciaDiariaRow } from '../../models/asistencia-diaria.model';
import type { AsistenciaImportResumen } from '../../models/asistencia-import.model';
import { badgeClass, condicionLabel, fmtMin } from '../../utils/asistencia-diaria-display.utils';
import {
  AsistenciaEmpleadoPeriodoDialogComponent,
} from './components/asistencia-empleado-periodo-dialog/asistencia-empleado-periodo-dialog.component';

/**
 * Detalle de una importación de asistencia (historial → clic en el lote). Muestra la asistencia
 * consolidada del lote en el formato de la consulta diaria, PERO de solo lectura (sin editar), y
 * un "Ver" por fila que abre la asistencia del empleado en el período (faltas y tardanzas).
 *
 * Base normativa: M04 / SPEC §12.2 PANTALLA-02. Solo consulta — no altera la asistencia.
 */
@Component({
  selector: 'app-detalle-importacion-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  templateUrl: './detalle-importacion-page.component.html',
  styleUrl: './detalle-importacion-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleImportacionPageComponent implements OnInit {
  private readonly api = inject(AsistenciaApiService);
  private readonly importApi = inject(AsistenciaImportApiService);
  private readonly tabs = inject(AsistenciaTabService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly errors = inject(ErrorMessageService);

  /** Id del lote (parámetro de la ruta importaciones/:id). */
  private importacionId = 0;
  id(): number {
    return this.importacionId;
  }

  readonly cols = [
    'indice',
    'dni',
    'nombre',
    'fecha',
    'horaIngreso',
    'horaSalida',
    'condicion',
    'papeleta',
    'tReal',
    'tEcono',
    'ver',
  ] as const;

  readonly filtroDni = signal('');
  readonly filtroNombre = signal('');
  /** Filtro server-side por tipoDia (null = todos). Lo alimenta el toggle y el query param. */
  readonly filtroTipoDia = signal<string | null>(null);
  /** true cuando el filtro activo es el de omisiones (para el estado del toggle). */
  readonly soloOmisiones = computed(() => this.filtroTipoDia() === 'OMISION_MARCACION');

  readonly resumen = signal<AsistenciaImportResumen | null>(null);
  readonly rows = signal<readonly AsistenciaDiariaRow[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  // Helpers de presentación compartidos.
  readonly condicionLabel = condicionLabel;
  readonly badgeClass = badgeClass;
  readonly fmtMin = fmtMin;

  ngOnInit(): void {
    this.importacionId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!this.importacionId) {
      this.loadError.set('Importación no válida.');
      return;
    }
    // Deep-link "Ver observadas" desde el Historial: preselecciona el filtro por tipoDia.
    const tipoDia = this.route.snapshot.queryParamMap.get('tipoDia');
    if (tipoDia) {
      this.filtroTipoDia.set(tipoDia);
    }
    this.cargarResumen();
    this.load();
  }

  private cargarResumen(): void {
    this.importApi.resumen(this.id()).subscribe({
      next: (r) => this.resumen.set(r),
      error: () => this.resumen.set(null),
    });
  }

  buscar(): void {
    this.pageIndex.set(0);
    this.load();
  }

  /** Alterna el filtro rápido "Ver Omisiones Pendientes" y recarga desde la primera página. */
  toggleOmisiones(): void {
    this.filtroTipoDia.set(this.soloOmisiones() ? null : 'OMISION_MARCACION');
    this.pageIndex.set(0);
    this.load();
  }

  /** Quita cualquier filtro por tipo de día (p. ej. el de "observadas" del deep-link). */
  limpiarFiltroTipo(): void {
    this.filtroTipoDia.set(null);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .listarPorImportacion(this.id(), {
        dni: this.filtroDni().trim() || undefined,
        q: this.filtroNombre().trim() || undefined,
        tipoDia: this.filtroTipoDia() ?? undefined,
        page: this.pageIndex(),
        size: this.pageSize(),
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.content);
          this.total.set(page.totalElements);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.rows.set([]);
          this.total.set(0);
          const body = err.error;
          this.loadError.set(
            isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
          );
        },
      });
  }

  indiceFila(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  fmtFecha(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  ver(row: AsistenciaDiariaRow): void {
    this.dialog.open(AsistenciaEmpleadoPeriodoDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      data: {
        empleadoId: row.empleadoId,
        periodo: row.periodo,
        dni: row.dni,
        nombre: row.nombreCompleto,
      },
    });
  }

  volver(): void {
    this.tabs.irAHistorial();
    this.router.navigate(['/asistencia/carga']);
  }
}
