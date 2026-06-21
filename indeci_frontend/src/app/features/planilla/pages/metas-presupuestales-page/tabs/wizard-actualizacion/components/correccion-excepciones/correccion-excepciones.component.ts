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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MetaPptoApiService } from '../../../../../../services/meta-ppto-api.service';
import { NotificacionService } from '../../../../../../../../core/services/notificacion.service';
import type { MetaDetEstado, MetaPptoCat, MetaPptoLoteDet } from '../../../../../../models/meta-ppto.model';

@Component({
  selector: 'app-correccion-excepciones',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './correccion-excepciones.component.html',
  styleUrl: './correccion-excepciones.component.css',
})
export class CorreccionExcepcionesComponent implements OnChanges {
  @Input() loteId     = 0;
  @Input() observados: MetaPptoLoteDet[] = [];
  @Input() metasCatalogo: MetaPptoCat[]  = [];
  @Input() procesando = false;

  @Output() readonly atras    = new EventEmitter<void>();
  @Output() readonly continuar = new EventEmitter<void>();
  @Output() readonly resolved  = new EventEmitter<void>();

  private readonly api   = inject(MetaPptoApiService);
  private readonly notif = inject(NotificacionService);
  private readonly snack = inject(MatSnackBar);

  // ── Filtros ──
  readonly filtroTipo      = signal<string>('TODOS');
  readonly filtroEstado    = signal<string>('TODOS');
  readonly filtroBusqueda  = signal<string>('');
  readonly currentPage     = signal(0);
  readonly pageSize        = 10;

  // ── Correcciones locales pendientes de guardar: Map<detId, metaId> ──
  readonly correccionesLocales = signal<ReadonlyMap<number, number>>(new Map());
  readonly guardando           = signal(false);

  readonly columnas = [
    'empleado', 'metaOrigen', 'metaSugerida',
    'metaCorregida', 'motivoObservacion', 'estadoCorreccion', 'acciones',
  ] as const;

  ngOnChanges(): void {
    this.correccionesLocales.set(new Map());
    this.currentPage.set(0);
  }

  // ── Datos filtrados/paginados ──
  get observadosFiltrados(): MetaPptoLoteDet[] {
    const busq   = this.filtroBusqueda().toLowerCase().trim();
    const tipo   = this.filtroTipo();
    const estado = this.filtroEstado();
    return this.observados.filter(d => {
      if (tipo !== 'TODOS' && d.estadoValidacion !== tipo) return false;
      if (estado === 'PENDIENTE' && this.correccionesLocales().has(d.id)) return false;
      if (estado === 'POR_GUARDAR' && !this.correccionesLocales().has(d.id)) return false;
      if (busq && !(
        (d.empleadoNombre ?? '').toLowerCase().includes(busq) ||
        (d.empleadoDni    ?? '').toLowerCase().includes(busq) ||
        (d.metaOrigenCodigo ?? '').toLowerCase().includes(busq)
      )) return false;
      return true;
    });
  }

  get observadosPaginados(): MetaPptoLoteDet[] {
    const ini = this.currentPage() * this.pageSize;
    return this.observadosFiltrados.slice(ini, ini + this.pageSize);
  }

  get inicioReg(): number { return this.currentPage() * this.pageSize + 1; }
  get finReg(): number {
    return Math.min((this.currentPage() + 1) * this.pageSize, this.observadosFiltrados.length);
  }

  // ── KPIs del panel resumen ──
  get totalObservados(): number  { return this.observados.length; }
  get totalCorregidas(): number  { return this.correccionesLocales().size; }
  get totalSinResolver(): number {
    return this.observados.filter(
      d => !d.metaDestinoId && !this.correccionesLocales().has(d.id),
    ).length;
  }
  get totalPendientes(): number {
    return this.observados.length - this.totalCorregidas - this.totalSinResolver;
  }
  get pctCorregidas(): number  { return this.pct(this.totalCorregidas); }
  get pctPendientes(): number  { return this.pct(this.totalPendientes); }
  get pctSinResolver(): number { return this.pct(this.totalSinResolver); }
  private pct(n: number): number {
    return this.totalObservados === 0 ? 0 : Math.round((n / this.totalObservados) * 100);
  }
  get hayCorrecciones(): boolean { return this.correccionesLocales().size > 0; }
  get todosListos(): boolean     { return this.observados.length === 0; }

  // ── Gestión de correcciones locales ──
  getMetaSeleccionada(detId: number): number | null {
    return this.correccionesLocales().get(detId) ?? null;
  }

  onSelectMeta(detId: number, metaId: number | null): void {
    const mapa = new Map(this.correccionesLocales());
    if (metaId !== null) {
      mapa.set(detId, metaId);
    } else {
      mapa.delete(detId);
    }
    this.correccionesLocales.set(mapa);
  }

  guardarCorrecciones(): void {
    const mapa = this.correccionesLocales();
    if (mapa.size === 0 || this.guardando()) return;

    this.guardando.set(true);
    const entradas  = Array.from(mapa.entries());
    let completados = 0;
    let errores     = 0;

    const procesarSiguiente = (i: number): void => {
      if (i >= entradas.length) {
        this.guardando.set(false);
        if (errores === 0) {
          this.notif.exito(`${completados} corrección(es) guardada(s) correctamente.`);
          this.correccionesLocales.set(new Map());
        } else {
          this.snack.open(
            `${completados} guardadas, ${errores} con error. Revise los pendientes.`,
            'Cerrar', { duration: 5000 },
          );
        }
        this.resolved.emit();
        return;
      }
      const [detId, metaId] = entradas[i];
      this.api
        .resolverExcepcion(this.loteId, { loteDetId: detId, metaDestinoId: metaId })
        .subscribe({
          next:  () => { completados++; procesarSiguiente(i + 1); },
          error: () => { errores++;     procesarSiguiente(i + 1); },
        });
    };

    procesarSiguiente(0);
  }

  resolverAutoSugerencias(): void {
    const conSugerencia = this.observados.filter(d => d.metaDestinoId !== null);
    if (conSugerencia.length === 0) {
      this.snack.open('No hay sugerencias automáticas disponibles.', 'Cerrar', { duration: 3000 });
      return;
    }
    const mapa = new Map(this.correccionesLocales());
    conSugerencia.forEach(d => { if (d.metaDestinoId) mapa.set(d.id, d.metaDestinoId); });
    this.correccionesLocales.set(mapa);
    this.snack.open(
      `${conSugerencia.length} sugerencia(s) cargadas. Revise y pulse "Guardar correcciones".`,
      'Cerrar', { duration: 4000 },
    );
  }

  limpiarFiltros(): void {
    this.filtroTipo.set('TODOS');
    this.filtroEstado.set('TODOS');
    this.filtroBusqueda.set('');
    this.currentPage.set(0);
  }

  onPage(event: PageEvent): void { this.currentPage.set(event.pageIndex); }
  onAtras(): void    { this.atras.emit(); }
  onContinuar(): void { this.continuar.emit(); }

  // ── Helpers de estilo y etiquetas ──
  estadoValidacionClass(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      OK: 'badge-ok', OBSERVADO: 'badge-warn',
      SIN_EQUIVALENCIA: 'badge-warn', META_DESTINO_INACTIVA: 'badge-err',
      EMPLEADO_INACTIVO: 'badge-gray', DUPLICADO: 'badge-err', ERROR: 'badge-err',
    };
    return m[estado] ?? 'badge-gray';
  }

  estadoValidacionLabel(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      OK: 'Correcto', OBSERVADO: 'Observado', SIN_EQUIVALENCIA: 'Sin coincidencia',
      META_DESTINO_INACTIVA: 'Meta anulada', EMPLEADO_INACTIVO: 'Emp. inactivo',
      DUPLICADO: 'Duplicado', ERROR: 'Error',
    };
    return m[estado] ?? estado;
  }

  estadoCorreccionClass(d: MetaPptoLoteDet): string {
    if (this.correccionesLocales().has(d.id)) return 'badge-green';
    if (d.estadoValidacion === 'EMPLEADO_INACTIVO') return 'badge-gray';
    if (d.metaDestinoId) return 'badge-orange';
    return 'badge-red';
  }

  estadoCorreccionLabel(d: MetaPptoLoteDet): string {
    if (this.correccionesLocales().has(d.id)) return 'Corregido manualmente';
    if (d.estadoValidacion === 'EMPLEADO_INACTIVO') return 'Sin resolver';
    if (d.metaDestinoId) return 'Requiere revisión';
    return 'Pendiente';
  }

  motivoIcono(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      SIN_EQUIVALENCIA: 'link_off', META_DESTINO_INACTIVA: 'cancel',
      DUPLICADO: 'content_copy',   OBSERVADO: 'warning_amber',
      EMPLEADO_INACTIVO: 'person_off', ERROR: 'error',
    };
    return m[estado] ?? 'info';
  }

  motivoIconoClass(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      SIN_EQUIVALENCIA: 'motivo-warn', META_DESTINO_INACTIVA: 'motivo-err',
      DUPLICADO: 'motivo-err', OBSERVADO: 'motivo-warn',
      EMPLEADO_INACTIVO: 'motivo-gray', ERROR: 'motivo-err',
    };
    return m[estado] ?? 'motivo-info';
  }

  truncar(texto: string | null, max: number): string {
    if (!texto) return '';
    return texto.length > max ? texto.substring(0, max) + '…' : texto;
  }

  motivoEtiqueta(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      SIN_EQUIVALENCIA: 'Sin coincidencia', META_DESTINO_INACTIVA: 'Meta destino anulada',
      DUPLICADO: 'Asignación duplicada',   OBSERVADO: 'Requiere revisión',
      EMPLEADO_INACTIVO: 'Empleado sin contrato', ERROR: 'Error del sistema',
    };
    return m[estado] ?? estado;
  }
}
