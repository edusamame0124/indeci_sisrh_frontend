import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import type {
  EstadoParametro,
  OnpParametroRow,
} from '../../../../../../models/parametro-previsional.model';
import {
  OnpVigenciaDialogComponent,
  type OnpDialogData,
} from '../onp-vigencia-dialog/onp-vigencia-dialog.component';
import {
  DuplicarVigenciaDialogComponent,
  type DuplicarVigenciaDialogData,
} from '../duplicar-vigencia-dialog/duplicar-vigencia-dialog.component';
import {
  EliminarVigenciaDialogComponent,
  type EliminarVigenciaDialogData,
} from '../eliminar-vigencia-dialog/eliminar-vigencia-dialog.component';

/**
 * Pestaña ONP — tabla de parámetros de vigencia del Sistema Nacional de Pensiones.
 * Spec: INDECI_ONP_PARAMETRO_VIGENCIA / Ley 19990 / D.S. 054-97-EF.
 */
@Component({
  selector: 'app-onp-tab',
  standalone: true,
  imports: [
    DecimalPipe,
    TitleCasePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onp-tab.component.html',
  styleUrl: './onp-tab.component.css',
})
export class OnpTabComponent implements OnInit {
  private readonly api    = inject(ParametroPrevisionalApiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly columns = [
    'vigenciaInicio', 'vigenciaFin',
    'aporteOnpPct', 'fuenteOficial',
    'observacion', 'estado', 'acciones',
  ] as const;

  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly estadosOpciones: Array<{ valor: EstadoParametro | ''; etiqueta: string }> = [
    { valor: '',           etiqueta: 'Todos' },
    { valor: 'VIGENTE',    etiqueta: 'Vigente' },
    { valor: 'PROGRAMADO', etiqueta: 'Programado' },
    { valor: 'CERRADO',    etiqueta: 'Cerrado' },
    { valor: 'INACTIVO',   etiqueta: 'Inactivo' },
    { valor: 'ANULADO',    etiqueta: 'Anulado' },
  ];

  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);
  readonly pageIndex     = signal(0);
  readonly pageSize      = signal(10);
  readonly filtroPeriodo = signal('');
  readonly filtroEstado  = signal<EstadoParametro | ''>('');
  readonly busqueda      = signal('');

  private readonly _rows = signal<readonly OnpParametroRow[]>([]);

  readonly rowsFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this._rows();
    return this._rows().filter((r) =>
      r.periodoInicio.includes(q) ||
      r.fuenteOficial.toLowerCase().includes(q),
    );
  });

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.rowsFiltradas().slice(start, start + this.pageSize());
  });

  readonly rangoMostrado = computed(() => {
    const total = this.rowsFiltradas().length;
    const start = this.pageIndex() * this.pageSize() + 1;
    const end   = Math.min(this.pageIndex() * this.pageSize() + this.pageSize(), total);
    return { start, end, total };
  });

  ngOnInit(): void {
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  onBusqueda(v: string): void {
    this.busqueda.set(v);
    this.pageIndex.set(0);
  }

  aplicarFiltros(): void {
    this.pageIndex.set(0);
    this.cargar();
  }

  formatPeriodo(periodo: string | null): string {
    if (!periodo || periodo.length !== 6) return periodo ?? '–';
    return `01/${periodo.slice(4, 6)}/${periodo.slice(0, 4)}`;
  }

  nuevaVigencia(): void {
    this.abrirDialog({ modo: 'crear' });
  }

  verDetalle(row: OnpParametroRow): void {
    this.abrirDialog({ modo: 'ver', row });
  }

  canDuplicar(row: OnpParametroRow): boolean {
    return row.estado !== 'INACTIVO' && row.estado !== 'ANULADO';
  }

  canEliminar(row: OnpParametroRow): boolean {
    return row.estado !== 'ANULADO' && !row.bloqueadoPorPlanilla;
  }

  tooltipEliminar(row: OnpParametroRow): string {
    if (row.estado === 'ANULADO') return 'Ya anulada';
    if (row.bloqueadoPorPlanilla) return 'Bloqueada por planilla cerrada';
    return 'Eliminar (anulación lógica con trazabilidad)';
  }

  eliminarFila(row: OnpParametroRow): void {
    const data: EliminarVigenciaDialogData = { tipo: 'ONP', row };
    this.dialog.open(EliminarVigenciaDialogComponent, {
      data,
      width: '580px',
      maxWidth: '95vw',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.snack.open(
          'Vigencia ONP anulada correctamente. Ya no será considerada por el motor de planilla.',
          'Cerrar',
          { duration: 4000 },
        );
        this.cargar();
      }
    });
  }

  duplicarFila(row: OnpParametroRow): void {
    const data: DuplicarVigenciaDialogData = { tipo: 'ONP', row };
    this.dialog.open(DuplicarVigenciaDialogComponent, {
      data,
      width: '560px',
      maxWidth: '95vw',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.snack.open('Vigencia ONP duplicada correctamente.', 'Cerrar', { duration: 3000 });
        this.cargar();
      }
    });
  }

  cerrarVigencia(row: OnpParametroRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open('Bloqueado: parámetro usado en planilla cerrada.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.api.cerrarOnpVigencia(row.id).subscribe({
      next: () => { this.snack.open('Vigencia ONP cerrada.', 'Cerrar', { duration: 3000 }); this.cargar(); },
      error: () => this.snack.open('Error al cerrar vigencia ONP.', 'Cerrar', { duration: 4000 }),
    });
  }

  editar(row: OnpParametroRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open(
        'No se puede editar este parámetro porque ya fue utilizado en una planilla cerrada. ' +
        'Cree una nueva vigencia o duplique la vigente para mantener la trazabilidad.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }
    this.abrirDialog({ modo: 'editar', row });
  }

  exportar(): void {
    this.snack.open('Exportación — próximamente.', 'Cerrar', { duration: 3000 });
  }

  private abrirDialog(data: OnpDialogData): void {
    const label = data.modo === 'crear' ? 'Vigencia ONP registrada correctamente.'
                : data.modo === 'editar' ? 'Vigencia ONP actualizada correctamente.' : '';
    this.dialog.open(OnpVigenciaDialogComponent, {
      data,
      width: '580px',
      maxWidth: '95vw',
      autoFocus: data.modo !== 'ver',
    }).afterClosed().subscribe((result) => {
      if (result && label) {
        this.snack.open(label, 'Cerrar', { duration: 3000 });
        this.cargar();
      }
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    const estado = this.filtroEstado() || undefined;
    this.api.onpParametros({
      periodo:        this.filtroPeriodo() || undefined,
      estado,
      incluirAnulados: estado === 'ANULADO' || undefined,
    }).subscribe({
      next: (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar los parámetros ONP.'); this.loading.set(false); },
    });
  }
}
