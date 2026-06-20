import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
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
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import type { EstadoIr4ta, Ir4taConfigRow } from '../../../../../../models/ir4ta-config.model';
import {
  Ir4taVigenciaDialogComponent,
  type Ir4taVigenciaDialogData,
} from '../ir4ta-vigencia-dialog/ir4ta-vigencia-dialog.component';
import {
  Ir4taDuplicarDialogComponent,
  type Ir4taDuplicarDialogData,
} from '../ir4ta-duplicar-dialog/ir4ta-duplicar-dialog.component';
import {
  Ir4taEliminarDialogComponent,
  type Ir4taEliminarDialogData,
} from '../ir4ta-eliminar-dialog/ir4ta-eliminar-dialog.component';

@Component({
  selector: 'app-rentas-4ta-cas-tab',
  standalone: true,
  imports: [
    DatePipe,
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
  templateUrl: './rentas-4ta-cas-tab.component.html',
  styleUrl: './rentas-4ta-cas-tab.component.css',
})
export class Rentas4taCasTabComponent implements OnInit {
  private readonly api    = inject(Ir4taConfigApiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly columns = [
    'anioFiscal', 'vigenciaInicio', 'vigenciaFin',
    'uitVigente', 'estado', 'fuenteOficial', 'acciones',
  ] as const;

  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly estadosOpciones: Array<{ valor: EstadoIr4ta | ''; etiqueta: string }> = [
    { valor: '',          etiqueta: 'Todos' },
    { valor: 'VIGENTE',   etiqueta: 'Vigente' },
    { valor: 'BORRADOR',  etiqueta: 'Borrador' },
    { valor: 'CERRADO',   etiqueta: 'Cerrado' },
    { valor: 'ANULADO',   etiqueta: 'Anulado' },
  ];

  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly pageIndex    = signal(0);
  readonly pageSize     = signal(10);
  readonly filtroEstado = signal<EstadoIr4ta | ''>('');
  readonly busqueda     = signal('');

  private readonly _rows = signal<readonly Ir4taConfigRow[]>([]);

  readonly rowsFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this._rows();
    return this._rows().filter(
      (r) =>
        String(r.anioFiscal).includes(q) ||
        r.fuenteOficial.toLowerCase().includes(q) ||
        (r.observacion ?? '').toLowerCase().includes(q),
    );
  });

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.rowsFiltradas().slice(start, start + this.pageSize());
  });

  readonly rangoMostrado = computed(() => {
    const total = this.rowsFiltradas().length;
    const start = this.pageIndex() * this.pageSize() + 1;
    const end   = Math.min(start + this.pageSize() - 1, total);
    return { start, end, total };
  });

  ngOnInit(): void { this.cargar(); }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  onBusqueda(v: string): void { this.busqueda.set(v); this.pageIndex.set(0); }

  aplicarFiltros(): void { this.pageIndex.set(0); this.cargar(); }

  nuevaVigencia(): void { this.abrirDialog({ modo: 'crear' }); }

  verDetalle(row: Ir4taConfigRow): void { this.abrirDialog({ modo: 'ver', row }); }

  editar(row: Ir4taConfigRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open(
        'No se puede editar esta vigencia porque ya fue utilizada en planilla cerrada.',
        'Cerrar', { duration: 6000 },
      );
      return;
    }
    this.abrirDialog({ modo: 'editar', row });
  }

  duplicar(row: Ir4taConfigRow): void {
    const data: Ir4taDuplicarDialogData = { row };
    this.dialog.open(Ir4taDuplicarDialogComponent, { data, width: '560px', maxWidth: '95vw' })
      .afterClosed().subscribe((result) => {
        if (result) { this.snack.open('Vigencia 4ta duplicada correctamente.', 'Cerrar', { duration: 3000 }); this.cargar(); }
      });
  }

  cerrarVigencia(row: Ir4taConfigRow): void {
    if (row.bloqueadoPorPlanilla) { this.snack.open('Bloqueado: parámetro usado en planilla cerrada.', 'Cerrar', { duration: 4000 }); return; }
    this.api.cerrar(row.id).subscribe({
      next: () => { this.snack.open('Vigencia 4ta cerrada.', 'Cerrar', { duration: 3000 }); this.cargar(); },
      error: () => this.snack.open('Error al cerrar vigencia 4ta.', 'Cerrar', { duration: 4000 }),
    });
  }

  publicar(row: Ir4taConfigRow): void {
    this.api.publicar(row.id).subscribe({
      next: () => { this.snack.open('Vigencia 4ta publicada correctamente.', 'Cerrar', { duration: 3000 }); this.cargar(); },
      error: (err: { error?: { message?: string } }) =>
        this.snack.open(err?.error?.message ?? 'Error al publicar vigencia.', 'Cerrar', { duration: 4000 }),
    });
  }

  eliminar(row: Ir4taConfigRow): void {
    const data: Ir4taEliminarDialogData = { row };
    this.dialog.open(Ir4taEliminarDialogComponent, { data, width: '560px', maxWidth: '95vw' })
      .afterClosed().subscribe((result) => {
        if (result) {
          this.snack.open('Vigencia anulada correctamente.', 'Cerrar', { duration: 4500 });
          this.cargar();
        }
      });
  }

  canEditar(row: Ir4taConfigRow): boolean  { return !row.bloqueadoPorPlanilla && row.estado !== 'ANULADO'; }
  canPublicar(row: Ir4taConfigRow): boolean { return row.estado === 'BORRADOR' && !row.bloqueadoPorPlanilla; }
  canCerrar(row: Ir4taConfigRow): boolean   { return row.estado === 'VIGENTE'  && !row.bloqueadoPorPlanilla; }
  canDuplicar(row: Ir4taConfigRow): boolean { return row.estado !== 'ANULADO'; }
  canEliminar(row: Ir4taConfigRow): boolean { return row.estado !== 'ANULADO'  && !row.bloqueadoPorPlanilla; }

  tooltipEliminar(row: Ir4taConfigRow): string {
    if (row.estado === 'ANULADO')       return 'Ya anulada';
    if (row.bloqueadoPorPlanilla)       return 'Bloqueada por planilla cerrada';
    return 'Eliminar (anulación lógica con trazabilidad)';
  }

  private abrirDialog(data: Ir4taVigenciaDialogData): void {
    const label =
      data.modo === 'crear'  ? 'Vigencia registrada correctamente.'  :
      data.modo === 'editar' ? 'Vigencia actualizada correctamente.' : '';
    this.dialog.open(Ir4taVigenciaDialogComponent, {
      data, width: '600px', maxWidth: '95vw', autoFocus: data.modo !== 'ver',
    }).afterClosed().subscribe((result) => {
      if (result && label) { this.snack.open(label, 'Cerrar', { duration: 3000 }); this.cargar(); }
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    const estado = this.filtroEstado() || undefined;
    this.api.listar({ estado, incluirAnulados: estado === 'ANULADO' || undefined }).subscribe({
      next:  (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar las configuraciones IR4ta.'); this.loading.set(false); },
    });
  }
}
