import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { MetaPptoApiService } from '../../../../services/meta-ppto-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { MetaFormDialogComponent } from './components/meta-form-dialog/meta-form-dialog.component';
import { VerDetalleMetaDialogComponent } from './components/ver-detalle-meta-dialog/ver-detalle-meta-dialog.component';
import { CambiarEstadoDialogComponent } from './components/cambiar-estado-dialog/cambiar-estado-dialog.component';
import { ImportarCatalogoDialogComponent } from './components/importar-catalogo-dialog/importar-catalogo-dialog.component';
import type { MetaPptoCat, MetaCatEstado } from '../../../../models/meta-ppto.model';

@Component({
  selector: 'app-catalogo-meta-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './catalogo-meta-tab.component.html',
  styleUrl: './catalogo-meta-tab.component.css',
})
export class CatalogoMetaTabComponent implements OnChanges {
  @Input() anioFiscal = 0;

  /** Emite el índice del sub-tab al que se debe navegar (4 = Ver historial). */
  @Output() readonly navegarA = new EventEmitter<number>();

  private readonly api     = inject(MetaPptoApiService);
  private readonly dialog  = inject(MatDialog);
  private readonly snack   = inject(MatSnackBar);
  private readonly notif   = inject(NotificacionService);
  private readonly errors  = inject(ErrorMessageService);

  // ── Tabla ──────────────────────────────────────────────────────────────────
  readonly columnas = [
    'seleccion', 'anioFiscal', 'metaCodigo', 'centroCosto',
    'categoriaPresupuestal', 'producto', 'actividad', 'finalidad',
    'estado', 'acciones',
  ] as const;

  // ── Estado ─────────────────────────────────────────────────────────────────
  readonly metas          = signal<MetaPptoCat[]>([]);
  readonly loading        = signal(false);

  // ── Filtros ────────────────────────────────────────────────────────────────
  readonly filtroBusqueda  = signal('');
  readonly filtroMeta      = signal('');
  readonly filtroCentro    = signal('');
  readonly filtroEstado    = signal<MetaCatEstado | ''>('');
  readonly currentPage     = signal(0);
  readonly pageSize        = 25;

  // ── Selección masiva ───────────────────────────────────────────────────────
  private readonly seleccion = signal(new Set<number>());

  // ─── Computed getters ──────────────────────────────────────────────────────

  get metasFiltradas(): MetaPptoCat[] {
    const b = this.filtroBusqueda().toLowerCase().trim();
    const m = this.filtroMeta().toLowerCase().trim();
    const c = this.filtroCentro().toLowerCase().trim();
    const e = this.filtroEstado();
    return this.metas().filter((meta) => {
      if (e && meta.estado !== e) return false;
      if (m && !meta.metaCodigo.toLowerCase().includes(m)) return false;
      if (c && !meta.centroCosto.toLowerCase().includes(c)) return false;
      if (b) {
        const hay =
          meta.metaCodigo.toLowerCase().includes(b)
          || meta.centroCosto.toLowerCase().includes(b)
          || meta.categoriaPresupuestal.toLowerCase().includes(b)
          || meta.producto.toLowerCase().includes(b)
          || meta.actividad.toLowerCase().includes(b)
          || meta.finalidad.toLowerCase().includes(b);
        if (!hay) return false;
      }
      return true;
    });
  }

  get metasPaginadas(): MetaPptoCat[] {
    const inicio = this.currentPage() * this.pageSize;
    return this.metasFiltradas.slice(inicio, inicio + this.pageSize);
  }

  get totalFiltrados(): number { return this.metasFiltradas.length; }

  get inicioRegistros(): number {
    return this.totalFiltrados === 0
      ? 0
      : this.currentPage() * this.pageSize + 1;
  }

  get finRegistros(): number {
    return Math.min((this.currentPage() + 1) * this.pageSize, this.totalFiltrados);
  }

  get totalPublicadas(): number { return this.metas().filter(m => m.estado === 'PUBLICADO').length; }
  get totalBorradores(): number { return this.metas().filter(m => m.estado === 'BORRADOR').length; }

  // ── Metadatos para dropdowns de filtro ────────────────────────────────────

  get metasUnicas(): string[] {
    return [...new Set(this.metas().map(m => m.metaCodigo))].sort();
  }

  get centrosUnicos(): string[] {
    return [...new Set(this.metas().map(m => m.centroCosto))].sort();
  }

  // ── Selección ─────────────────────────────────────────────────────────────

  get seleccionActual(): Set<number> { return this.seleccion(); }
  get haySeleccion(): boolean { return this.seleccion().size > 0; }
  get cantidadSeleccionada(): number { return this.seleccion().size; }

  get todosPaginadosSeleccionados(): boolean {
    const pag = this.metasPaginadas;
    return pag.length > 0 && pag.every(m => this.seleccion().has(m.id));
  }

  get algunPaginadoSeleccionado(): boolean {
    return this.metasPaginadas.some(m => this.seleccion().has(m.id));
  }

  estaSeleccionada(id: number): boolean {
    return this.seleccion().has(id);
  }

  toggleFila(id: number): void {
    const s = new Set(this.seleccion());
    s.has(id) ? s.delete(id) : s.add(id);
    this.seleccion.set(s);
  }

  toggleTodosPaginados(checked: boolean): void {
    const s = new Set(this.seleccion());
    for (const m of this.metasPaginadas) {
      checked ? s.add(m.id) : s.delete(m.id);
    }
    this.seleccion.set(s);
  }

  limpiarSeleccion(): void { this.seleccion.set(new Set()); }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnChanges(): void {
    if (this.anioFiscal > 0) this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.currentPage.set(0);
    this.limpiarSeleccion();
    this.api.listarCatalogo(this.anioFiscal).subscribe({
      next: (data) => { this.metas.set(data); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.mostrarError(err); },
    });
  }

  onPage(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.limpiarSeleccion();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroMeta.set('');
    this.filtroCentro.set('');
    this.filtroEstado.set('');
    this.currentPage.set(0);
  }

  // ── Diálogos ──────────────────────────────────────────────────────────────

  abrirFormMeta(meta: MetaPptoCat | null): void {
    const ref = this.dialog.open(MetaFormDialogComponent, {
      data: { meta, anioFiscal: this.anioFiscal },
      width: '620px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) { this.notif.exito('Meta registrada correctamente.'); this.cargar(); }
    });
  }

  verDetalle(meta: MetaPptoCat): void {
    this.dialog.open(VerDetalleMetaDialogComponent, {
      data: { meta },
      width: '620px',
    });
  }

  abrirImportar(): void {
    const ref = this.dialog.open(ImportarCatalogoDialogComponent, {
      data: { anioFiscal: this.anioFiscal, metasExistentes: this.metas() },
      width: '860px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }

  // ── Acciones masivas ──────────────────────────────────────────────────────

  accionMasiva(nuevoEstado: MetaCatEstado): void {
    const idsSeleccionados = [...this.seleccion()];
    const metasSeleccionadas = this.metas().filter(m => idsSeleccionados.includes(m.id));

    const ref = this.dialog.open(CambiarEstadoDialogComponent, {
      data: { nuevoEstado, metas: metasSeleccionadas },
      width: '580px',
      disableClose: true,
    });

    ref.afterClosed().subscribe((result) => {
      if (!result?.confirmar) return;
      const idsAptos = this.metas()
        .filter(m => idsSeleccionados.includes(m.id) && puedeTransicionar(m.estado, nuevoEstado))
        .map(m => m.id);

      if (idsAptos.length === 0) return;

      this.loading.set(true);
      this.api.cambiarEstadoMasivo(idsAptos, nuevoEstado, result.motivo).subscribe({
        next: (res) => {
          this.loading.set(false);
          this.limpiarSeleccion();
          this.notif.exito(`${res.exitosos} meta(s) actualizadas. ${res.omitidos > 0 ? res.omitidos + ' omitidas.' : ''}`);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => { this.loading.set(false); this.mostrarError(err); },
      });
    });
  }

  anular(meta: MetaPptoCat): void {
    const ref = this.dialog.open(CambiarEstadoDialogComponent, {
      data: { nuevoEstado: 'ANULADO' as MetaCatEstado, metas: [meta] },
      width: '520px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((result) => {
      if (!result?.confirmar) return;
      this.api.anularMeta(meta.id, result.motivo ?? '').subscribe({
        next: () => { this.notif.exito('Meta anulada correctamente.'); this.cargar(); },
        error: (err: HttpErrorResponse) => this.mostrarError(err),
      });
    });
  }

  // ── Exportar CSV ──────────────────────────────────────────────────────────

  exportarCsv(): void {
    const filas = this.metasFiltradas;
    const encabezado = 'Año Fiscal,Meta,Centro de Costo,Categoría Presupuestal,Producto,Actividad,Finalidad,Estado';
    const cuerpo = filas.map(m =>
      [m.anioFiscal, m.metaCodigo, m.centroCosto, m.categoriaPresupuestal,
       m.producto, m.actividad, m.finalidad, m.estado]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [encabezado, ...cuerpo].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo_metas_${this.anioFiscal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'badge-warn', VALIDADO: 'badge-info',
      PUBLICADO: 'badge-ok',  CERRADO: 'badge-gray', ANULADO: 'badge-err',
    };
    return mapa[estado] ?? 'badge-gray';
  }

  estadoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'Borrador', VALIDADO: 'Validado',
      PUBLICADO: 'Publicado', CERRADO: 'Cerrado', ANULADO: 'Anulado',
    };
    return mapa[estado] ?? estado;
  }

  esEditable(meta: MetaPptoCat): boolean {
    return meta.estado !== 'ANULADO' && meta.estado !== 'CERRADO';
  }

  private mostrarError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
  }
}

/** Regla de transición de estados del catálogo. */
function puedeTransicionar(estadoActual: MetaCatEstado, nuevoEstado: MetaCatEstado): boolean {
  const ESTADOS_ORIGEN: Record<MetaCatEstado, MetaCatEstado[]> = {
    BORRADOR:  [],
    VALIDADO:  ['BORRADOR'],
    PUBLICADO: ['BORRADOR', 'VALIDADO'],
    CERRADO:   ['PUBLICADO'],
    ANULADO:   ['BORRADOR', 'VALIDADO', 'PUBLICADO'],
  };
  return (ESTADOS_ORIGEN[nuevoEstado] ?? []).includes(estadoActual);
}
