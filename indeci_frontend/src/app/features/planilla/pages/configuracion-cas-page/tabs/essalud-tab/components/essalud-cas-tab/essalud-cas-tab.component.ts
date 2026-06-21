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
import { DecimalPipe, SlicePipe } from '@angular/common';
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
import { EssaludApiService } from '../../../../../../services/essalud-api.service';
import type { EstadoEssalud, EssaludVigenciaRow } from '../../../../../../models/essalud.model';
import {
  EssaludVigenciaDialogComponent,
  type EssaludVigenciaDialogData,
} from '../essalud-vigencia-dialog/essalud-vigencia-dialog.component';
import {
  DuplicarEssaludDialogComponent,
  type DuplicarEssaludDialogData,
} from '../duplicar-essalud-dialog/duplicar-essalud-dialog.component';
import {
  EliminarEssaludDialogComponent,
  type EliminarEssaludDialogData,
} from '../eliminar-essalud-dialog/eliminar-essalud-dialog.component';

@Component({
  selector: 'app-essalud-cas-tab',
  standalone: true,
  imports: [
    DecimalPipe, SlicePipe,
    MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatTooltipModule, MatPaginatorModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './essalud-cas-tab.component.html',
  styleUrl: './essalud-cas-tab.component.css',
})
export class EssaludCasTabComponent implements OnInit {
  private readonly api        = inject(EssaludApiService);
  private readonly snack      = inject(MatSnackBar);
  private readonly dialog     = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$  = new Subject<string>();

  readonly columns = [
    'vigenciaInicio', 'vigenciaFin', 'uitVigente',
    'pctBaseCas', 'baseMaximaCas', 'pctEssalud',
    'pctEssaludEps', 'pctCreditoEps',
    'fuenteOficial', 'estado', 'acciones',
  ] as const;

  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly trackByRow = (_: number, r: EssaludVigenciaRow): number => r.id;

  readonly estadosOpciones: Array<{ valor: EstadoEssalud | ''; etiqueta: string }> = [
    { valor: '',           etiqueta: 'Todos' },
    { valor: 'VIGENTE',    etiqueta: 'Vigente' },
    { valor: 'PROGRAMADO', etiqueta: 'Programado' },
    { valor: 'CERRADO',    etiqueta: 'Cerrado' },
    { valor: 'ANULADO',    etiqueta: 'Anulado' },
  ];

  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly pageIndex    = signal(0);
  readonly pageSize     = signal(10);
  readonly filtroEstado = signal<EstadoEssalud | ''>('');
  readonly busqueda     = signal('');

  private readonly _rows = signal<readonly EssaludVigenciaRow[]>([]);

  readonly rowsFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this._rows();
    return this._rows().filter((r) =>
      r.fuenteOficial.toLowerCase().includes(q) ||
      (r.vigenciaInicio ?? '').includes(q) ||
      String(r.uitVigente).includes(q),
    );
  });

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.rowsFiltradas().slice(start, start + this.pageSize());
  });

  readonly rango = computed(() => {
    const total = this.rowsFiltradas().length;
    const start = this.pageIndex() * this.pageSize() + 1;
    const end   = Math.min(this.pageIndex() * this.pageSize() + this.pageSize(), total);
    return { start, end, total };
  });

  ngOnInit(): void {
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => { this.busqueda.set(v); this.pageIndex.set(0); });
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  onBusqueda(v: string): void { this.busqueda$.next(v); }

  aplicarFiltros(): void { this.pageIndex.set(0); this.cargar(); }

  nuevaVigencia(): void {
    const data: EssaludVigenciaDialogData = { modo: 'crear' };
    this.dialog.open(EssaludVigenciaDialogComponent, { data, width: '860px', maxWidth: '95vw', maxHeight: '90vh', autoFocus: true })
      .afterClosed().subscribe((ok) => {
        if (ok) { this.snack.open('Vigencia EsSalud registrada correctamente.', 'Cerrar', { duration: 3500 }); this.cargar(); }
      });
  }

  verDetalle(row: EssaludVigenciaRow): void {
    const data: EssaludVigenciaDialogData = { modo: 'ver', row };
    this.dialog.open(EssaludVigenciaDialogComponent, { data, width: '860px', maxWidth: '95vw', maxHeight: '90vh', autoFocus: false });
  }

  editar(row: EssaludVigenciaRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open('No se puede editar: la vigencia está usada en una planilla cerrada.', 'Cerrar', { duration: 5000 });
      return;
    }
    const data: EssaludVigenciaDialogData = { modo: 'editar', row };
    this.dialog.open(EssaludVigenciaDialogComponent, { data, width: '860px', maxWidth: '95vw', maxHeight: '90vh', autoFocus: true })
      .afterClosed().subscribe((ok) => {
        if (ok) { this.snack.open('Vigencia EsSalud actualizada.', 'Cerrar', { duration: 3000 }); this.cargar(); }
      });
  }

  duplicarFila(row: EssaludVigenciaRow): void {
    const data: DuplicarEssaludDialogData = { row };
    this.dialog.open(DuplicarEssaludDialogComponent, { data, width: '580px', maxWidth: '95vw', maxHeight: '90vh' })
      .afterClosed().subscribe((ok) => {
        if (ok) { this.snack.open('Vigencia EsSalud duplicada correctamente.', 'Cerrar', { duration: 3000 }); this.cargar(); }
      });
  }

  cerrarVigencia(row: EssaludVigenciaRow): void {
    if (row.bloqueadoPorPlanilla) {
      this.snack.open('No se puede cerrar: bloqueada por planilla cerrada.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.api.cerrarVigencia(row.id).subscribe({
      next: () => { this.snack.open('Vigencia cerrada.', 'Cerrar', { duration: 3000 }); this.cargar(); },
      error: (err) => this.snack.open(err?.error?.message ?? 'Error al cerrar vigencia.', 'Cerrar', { duration: 4000 }),
    });
  }

  eliminarFila(row: EssaludVigenciaRow): void {
    const data: EliminarEssaludDialogData = { row };
    this.dialog.open(EliminarEssaludDialogComponent, { data, width: '580px', maxWidth: '95vw', maxHeight: '90vh' })
      .afterClosed().subscribe((ok) => {
        if (ok) { this.snack.open('Vigencia EsSalud anulada. El motor la ignorará en futuros cálculos.', 'Cerrar', { duration: 4000 }); this.cargar(); }
      });
  }

  canEditar(row: EssaludVigenciaRow): boolean  { return !row.bloqueadoPorPlanilla && row.estado !== 'ANULADO'; }
  canDuplicar(row: EssaludVigenciaRow): boolean { return row.estado !== 'ANULADO'; }
  canCerrar(row: EssaludVigenciaRow): boolean   { return row.estado === 'VIGENTE' && !row.bloqueadoPorPlanilla; }
  canEliminar(row: EssaludVigenciaRow): boolean { return row.estado !== 'ANULADO' && !row.bloqueadoPorPlanilla; }

  tooltipEliminar(row: EssaludVigenciaRow): string {
    if (row.estado === 'ANULADO')   return 'Ya anulada';
    if (row.bloqueadoPorPlanilla)   return 'Bloqueada por planilla cerrada';
    return 'Anular vigencia (con trazabilidad)';
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    const estado = this.filtroEstado() || undefined;
    this.api.listarVigencias({ estado, incluirAnulados: estado === 'ANULADO' }).subscribe({
      next: (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar la configuración EsSalud.'); this.loading.set(false); },
    });
  }
}
