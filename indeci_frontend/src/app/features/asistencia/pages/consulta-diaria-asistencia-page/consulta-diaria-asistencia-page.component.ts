import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { CONDICION_LABELS } from '../../models/asistencia-diaria.model';
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
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

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
    'editar',
    'ver',
  ] as const;

  readonly fechaModel = signal<Date | null>(parseIsoDate(hoyIso()));
  readonly filtroDni = signal('');
  readonly filtroNombre = signal('');
  readonly consultaEjecutada = signal(false);
  readonly consultaHora = signal<string | null>(null);

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
        this.fechaModel.set(parseIsoDate(fecha));
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

  tituloFecha(): string {
    const iso = toIsoDate(this.fechaModel());
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  condicionLabel(tipo: string | null | undefined): string {
    if (!tipo) return '—';
    return CONDICION_LABELS[tipo] ?? tipo;
  }

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

  badgeClass(tipo: string | null | undefined): string {
    switch (tipo) {
      case 'LABORAL':
      case 'TELETRABAJO':
        return 'diaria__badge diaria__badge--ok';
      case 'TARDANZA':
        return 'diaria__badge diaria__badge--warn';
      case 'FALTA':
      case 'SANCION_PAD':
        return 'diaria__badge diaria__badge--danger';
      case 'PERMISO':
      case 'LICENCIA':
        return 'diaria__badge diaria__badge--info';
      default:
        return 'diaria__badge';
    }
  }

  fmtMin(value: number | null | undefined): string {
    if (value == null || value <= 0) return '—';
    const h = Math.floor(value / 60);
    const m = value % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  indiceFila(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  buscar(): void {
    const fecha = toIsoDate(this.fechaModel());
    if (!fecha) {
      this.loadError.set('Seleccione una fecha para consultar.');
      return;
    }
    this.consultaEjecutada.set(true);
    this.pageIndex.set(0);
    this.load(fecha);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    const fecha = toIsoDate(this.fechaModel());
    if (fecha) this.load(fecha);
  }

  private load(fecha: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listarDiaria({
      fecha,
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
      const fecha = toIsoDate(this.fechaModel());
      if (fecha) this.load(fecha);
    });
  }

  ver(row: AsistenciaDiariaRow): void {
    this.dialog.open(AsistenciaDiariaVerDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { row },
    });
  }
}
