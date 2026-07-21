import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { AsistenciaApiService } from '../../services/asistencia-api.service';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import type { AsistenciaDiariaRow } from '../../models/asistencia-diaria.model';
import { badgeClass, condicionLabel, fmtMin } from '../../utils/asistencia-diaria-display.utils';
import {
  AsistenciaDiariaEditDialogComponent,
} from './components/asistencia-diaria-edit-dialog/asistencia-diaria-edit-dialog.component';
import {
  AsistenciaDiariaVerDialogComponent,
} from './components/asistencia-diaria-ver-dialog/asistencia-diaria-ver-dialog.component';

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hoyIso(): string {
  return toIsoDate(new Date()) ?? '';
}

/** Primer día del mes actual (ISO) — valor por defecto de "Fecha de inicio". */
function primerDiaMesIso(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)) ?? '';
}

@Component({
  selector: 'app-consulta-diaria-asistencia-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  templateUrl: './consulta-diaria-asistencia-page.component.html',
  styleUrl: './consulta-diaria-asistencia-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaDiariaAsistenciaPageComponent {
  private readonly api = inject(AsistenciaApiService);
  private readonly tabs = inject(AsistenciaTabService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cols = [
    'indice',
    'dni',
    'nombre',
    'lote',
    'fecha',
    'horaIngreso',
    'horaSalida',
    'condicion',
    'papeleta',
    'tReal',
    'tEcono',
    'editar',
    'ver',
  ] as const;

  // Rango por defecto: mes actual (día 1 → hoy).
  readonly fechaInicioModel = signal<Date | null>(parseIsoDate(primerDiaMesIso()));
  readonly fechaFinModel = signal<Date | null>(parseIsoDate(hoyIso()));
  readonly filtroDni = signal('');
  readonly filtroNombre = signal('');
  readonly consultaEjecutada = signal(false);
  readonly consultaHora = signal<string | null>(null);

  /** El rango es válido cuando ambas fechas existen y fin ≥ inicio. */
  readonly rangoValido = computed(() => {
    const ini = this.fechaInicioModel();
    const fin = this.fechaFinModel();
    return !!ini && !!fin && fin.getTime() >= ini.getTime();
  });

  readonly rows = signal<readonly AsistenciaDiariaRow[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const fecha = this.tabs.preselectFecha();
      const dni = this.tabs.preselectDni();
      if (fecha) {
        // Preselección desde otra pestaña ("ver asistencia de este día"): rango de un solo día.
        this.fechaInicioModel.set(parseIsoDate(fecha));
        this.fechaFinModel.set(parseIsoDate(fecha));
        this.tabs.preselectFecha.set(null);
      }
      if (dni) {
        this.filtroDni.set(dni);
        this.tabs.preselectDni.set(null);
      }
      if (fecha || dni) {
        this.buscar();
      }
    });
  }

  tituloRango(): string {
    const ini = toIsoDate(this.fechaInicioModel());
    const fin = toIsoDate(this.fechaFinModel());
    if (!ini || !fin) return '—';
    const fmt = (iso: string): string => {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };
    return ini === fin ? fmt(ini) : `${fmt(ini)} a ${fmt(fin)}`;
  }

  // Helpers de presentación compartidos (DRY con el detalle de importación).
  readonly condicionLabel = condicionLabel;
  readonly badgeClass = badgeClass;
  readonly fmtMin = fmtMin;

  /** Tooltip de la papeleta aprobada: tipo · motivo · horario. */
  papeletaTooltip(row: AsistenciaDiariaRow): string {
    if (!row.tienePapeletaAprobada) return '';
    const partes: string[] = [];
    if (row.papeletaTipo) partes.push(row.papeletaTipo);
    if (row.papeletaMotivo) partes.push(row.papeletaMotivo);
    const horario = this.papeletaHorario(row);
    if (horario) partes.push(horario);
    return partes.join(' · ');
  }

  private papeletaHorario(row: AsistenciaDiariaRow): string {
    const ini = row.papeletaHoraInicio;
    const fin = row.papeletaHoraFin;
    const horas = row.papeletaCantidadHoras;
    if (ini && fin) {
      return horas != null ? `${ini}–${fin} (${horas} h)` : `${ini}–${fin}`;
    }
    return horas != null ? `${horas} h` : '';
  }

  indiceFila(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  buscar(): void {
    if (!this.rangoValido()) {
      this.loadError.set(
        'Seleccione un rango válido: la fecha fin debe ser posterior o igual a la de inicio.',
      );
      return;
    }
    this.consultaEjecutada.set(true);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    if (this.rangoValido()) this.load();
  }

  private load(): void {
    const fechaInicio = toIsoDate(this.fechaInicioModel());
    const fechaFin = toIsoDate(this.fechaFinModel());
    if (!fechaInicio || !fechaFin) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listarDiaria({
      fechaInicio,
      fechaFin,
      dni: this.filtroDni().trim() || undefined,
      q: this.filtroNombre().trim() || undefined,
      page: this.pageIndex(),
      size: this.pageSize(),
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.rows.set(page.content);
          this.total.set(page.totalElements);
          this.consultaHora.set(
            new Intl.DateTimeFormat('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(new Date()),
          );
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.rows.set([]);
          this.total.set(0);
          const body = err instanceof HttpErrorResponse ? err.error : null;
          this.loadError.set(
            isErrorResponse(body)
              ? this.errors.translate(body.mensaje)
              : this.errors.translate(null),
          );
        },
      });
  }

  editar(row: AsistenciaDiariaRow): void {
    const ref = this.dialog.open(AsistenciaDiariaEditDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { row },
    });
    ref.afterClosed().subscribe((updated: AsistenciaDiariaRow | undefined) => {
      if (!updated) return;
      this.snack.open('Asistencia actualizada correctamente.', 'Cerrar', { duration: 4000 });
      if (this.rangoValido()) this.load();
    });
  }

  ver(row: AsistenciaDiariaRow): void {
    this.dialog.open(AsistenciaDiariaVerDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { row },
    });
  }

  /** Abre el detalle del lote que originó esta cabecera (asistencia importada). */
  verLote(row: AsistenciaDiariaRow): void {
    if (row.importacionId == null) {
      return;
    }
    this.router.navigate(['/asistencia/importaciones', row.importacionId]);
  }
}
