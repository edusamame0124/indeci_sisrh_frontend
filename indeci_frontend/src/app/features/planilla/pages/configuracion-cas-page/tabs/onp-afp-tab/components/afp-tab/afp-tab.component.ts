import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
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
  AfpCatalogRow,
  AfpParametroRow,
  EstadoParametro,
} from '../../../../../../models/parametro-previsional.model';
import {
  AfpVigenciaDialogComponent,
  type AfpDialogData,
} from '../afp-vigencia-dialog/afp-vigencia-dialog.component';
import {
  DuplicarVigenciaDialogComponent,
  type DuplicarVigenciaDialogData,
} from '../duplicar-vigencia-dialog/duplicar-vigencia-dialog.component';
import {
  EliminarVigenciaDialogComponent,
  type EliminarVigenciaDialogData,
} from '../eliminar-vigencia-dialog/eliminar-vigencia-dialog.component';

/**
 * Pestaña AFP — tabla de parámetros de vigencia por AFP.
 * Spec: INDECI_AFP_PARAMETRO_VIGENCIA / TUO SPP D.S. 054-97-EF.
 */
@Component({
  selector: 'app-afp-tab',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
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
  templateUrl: './afp-tab.component.html',
  styleUrl: './afp-tab.component.css',
})
export class AfpTabComponent implements OnInit {
  private readonly api       = inject(ParametroPrevisionalApiService);
  private readonly snack     = inject(MatSnackBar);
  private readonly dialog    = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly columns = [
    'afp', 'vigenciaInicio', 'vigenciaFin',
    'aporteObligatorioPct', 'comisionFlujoPct', 'comisionSaldoAnualPct',
    'primaSeguroPct', 'remuneracionMaximaAsegurable',
    'fuenteOficial', 'estado', 'acciones',
  ] as const;

  readonly pageSizeOptions = [10, 20, 50, 100] as const;

  readonly trackByRow = (_: number, r: AfpParametroRow): number => r.id;
  readonly estadosOpciones: Array<{ valor: EstadoParametro | ''; etiqueta: string }> = [
    { valor: '',          etiqueta: 'Todos' },
    { valor: 'VIGENTE',   etiqueta: 'Vigente' },
    { valor: 'PROGRAMADO',etiqueta: 'Programado' },
    { valor: 'CERRADO',   etiqueta: 'Cerrado' },
    { valor: 'INACTIVO',  etiqueta: 'Inactivo' },
    { valor: 'ANULADO',   etiqueta: 'Anulado' },
  ];

  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);
  readonly pageIndex     = signal(0);
  readonly pageSize      = signal(10);
  readonly filtroPeriodo = signal('');
  readonly filtroAfpId   = signal<number | null>(null);
  readonly filtroEstado  = signal<EstadoParametro | ''>('');
  readonly busqueda      = signal('');
  readonly afpCatalog    = signal<readonly AfpCatalogRow[]>([]);

  private readonly _rows = signal<readonly AfpParametroRow[]>([]);

  readonly rowsFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this._rows();
    return this._rows().filter((r) =>
      r.afpNombre.toLowerCase().includes(q) ||
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
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => { this.busqueda.set(v); this.pageIndex.set(0); });
    this.cargarCatalog();
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  onBusqueda(v: string): void {
    this.busqueda$.next(v);
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
    this.abrirDialog({ modo: 'crear', catalog: this.afpCatalog() });
  }

  duplicarVigencia(): void {
    this.snack.open('Use el ícono ⧉ en la fila deseada para duplicar esa vigencia.', 'Cerrar', { duration: 4000 });
  }

  canDuplicar(row: AfpParametroRow): boolean {
    return row.estado !== 'INACTIVO' && row.estado !== 'ANULADO';
  }

  canEliminar(row: AfpParametroRow): boolean {
    return row.estado !== 'ANULADO' && !row.bloqueadoPorPlanilla;
  }

  tooltipEliminar(row: AfpParametroRow): string {
    if (row.estado === 'ANULADO')    return 'Ya anulada';
    if (row.bloqueadoPorPlanilla)    return 'Bloqueada por planilla cerrada';
    return 'Eliminar (anulación lógica con trazabilidad)';
  }

  eliminarFila(row: AfpParametroRow): void {
    const data: EliminarVigenciaDialogData = { tipo: 'AFP', row };
    this.dialog.open(EliminarVigenciaDialogComponent, {
      data,
      width: '580px',
      maxWidth: '95vw',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.snack.open(
          'Vigencia AFP anulada correctamente. Ya no será considerada por el motor de planilla.',
          'Cerrar',
          { duration: 4000 },
        );
        this.cargar();
      }
    });
  }

  duplicarFila(row: AfpParametroRow): void {
    const data: DuplicarVigenciaDialogData = { tipo: 'AFP', row };
    this.dialog.open(DuplicarVigenciaDialogComponent, {
      data,
      width: '560px',
      maxWidth: '95vw',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.snack.open('Vigencia AFP duplicada correctamente.', 'Cerrar', { duration: 3000 });
        this.cargar();
      }
    });
  }

  cerrarVigencia(row: AfpParametroRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open('Bloqueado: parámetro usado en planilla cerrada.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.api.cerrarAfpVigencia(row.id).subscribe({
      next: () => { this.snack.open('Vigencia cerrada.', 'Cerrar', { duration: 3000 }); this.cargar(); },
      error: () => this.snack.open('Error al cerrar vigencia.', 'Cerrar', { duration: 4000 }),
    });
  }

  verDetalle(row: AfpParametroRow): void {
    this.abrirDialog({ modo: 'ver', row, catalog: this.afpCatalog() });
  }

  editar(row: AfpParametroRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open(
        'No se puede editar este parámetro porque ya fue utilizado en una planilla cerrada. ' +
        'Cree una nueva vigencia o duplique la vigente para mantener la trazabilidad.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }
    this.abrirDialog({ modo: 'editar', row, catalog: this.afpCatalog() });
  }

  exportar(): void {
    this.snack.open('Exportación — próximamente.', 'Cerrar', { duration: 3000 });
  }

  private abrirDialog(data: AfpDialogData): void {
    const label = data.modo === 'crear' ? 'Vigencia AFP registrada correctamente.'
                : data.modo === 'editar' ? 'Vigencia AFP actualizada correctamente.' : '';
    this.dialog.open(AfpVigenciaDialogComponent, {
      data,
      width: '680px',
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
    this.api.afpParametros({
      periodo:        this.filtroPeriodo() || undefined,
      afpId:          this.filtroAfpId() ?? undefined,
      estado,
      incluirAnulados: estado === 'ANULADO' || undefined,
    }).subscribe({
      next: (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar los parámetros AFP.'); this.loading.set(false); },
    });
  }

  private cargarCatalog(): void {
    this.api.afpCatalog().subscribe({
      next: (list) => this.afpCatalog.set(list),
      error: () => {},
    });
  }
}
