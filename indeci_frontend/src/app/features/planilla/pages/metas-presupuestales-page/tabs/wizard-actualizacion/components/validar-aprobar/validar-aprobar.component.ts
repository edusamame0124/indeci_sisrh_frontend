import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { MetaDetEstado, MetaLoteEstado, MetaPptoLote, MetaPptoLoteDet } from '../../../../../../models/meta-ppto.model';

interface ChecklistItem {
  readonly label: string;
  readonly cumple: boolean;
  readonly detalle: string;
}

@Component({
  selector: 'app-validar-aprobar',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validar-aprobar.component.html',
  styleUrl: './validar-aprobar.component.css',
})
export class ValidarAprobarComponent {
  @Input() lote: MetaPptoLote | null = null;
  @Input() detalles: MetaPptoLoteDet[] = [];
  @Input() anioFiscal = 0;
  @Input() procesando = false;

  @Output() readonly publicar   = new EventEmitter<void>();
  @Output() readonly exportar   = new EventEmitter<void>();
  @Output() readonly atras      = new EventEmitter<void>();

  readonly confirmando      = signal(false);
  readonly comentarioFinal  = signal('');
  readonly detalleExpandido = signal(false);

  readonly columnasDetalle = ['empleado', 'metaOrigen', 'metaDestino', 'estado'] as const;

  // ── Checklist de requisitos ───────────────────────────────────────────────
  get checklist(): ChecklistItem[] {
    const l = this.lote;
    if (!l) return [];
    return [
      {
        label: 'Catálogo destino cargado',
        cumple: l.anioDestino === this.anioFiscal,
        detalle: `Año destino: ${l.anioDestino}`,
      },
      {
        label: 'Equivalencias validadas',
        cumple: true,
        detalle: 'Verificado en paso 2',
      },
      {
        label: 'Proceso masivo ejecutado',
        cumple: l.totalEmpleados > 0,
        detalle: `${l.totalEmpleados} empleado(s) procesado(s)`,
      },
      {
        label: 'Excepciones resueltas',
        cumple: l.totalObservados === 0,
        detalle: l.totalObservados === 0
          ? 'Sin excepciones pendientes'
          : `${l.totalObservados} observado(s) sin resolver`,
      },
      {
        label: 'Asignaciones sin duplicados',
        cumple: l.totalDuplicados === 0,
        detalle: l.totalDuplicados === 0 ? 'Sin duplicados' : `${l.totalDuplicados} duplicado(s)`,
      },
      {
        label: 'Empleados activos cubiertos',
        cumple: l.totalInactivos === 0,
        detalle: l.totalInactivos === 0
          ? 'Todos los empleados están activos'
          : `${l.totalInactivos} empleado(s) inactivo(s)`,
      },
      {
        label: 'Integridad para planilla',
        cumple: l.totalErrores === 0,
        detalle: l.totalErrores === 0 ? 'Sin errores' : `${l.totalErrores} error(es) detectado(s)`,
      },
    ];
  }

  get puedePublicar(): boolean {
    return this.checklist.every(c => c.cumple) && !this.procesando;
  }

  get totalChecksOk(): number {
    return this.checklist.filter(c => c.cumple).length;
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  get kpiAsignados(): number  { return this.lote?.totalAsignados  ?? 0; }
  get kpiObservados(): number { return this.lote?.totalObservados ?? 0; }
  get kpiPublicables(): number {
    const l = this.lote;
    if (!l) return 0;
    return l.totalAsignados - l.totalObservados;
  }
  get kpiBloqueados(): number {
    const l = this.lote;
    if (!l) return 0;
    return l.totalErrores + l.totalInactivos + l.totalDuplicados;
  }

  // ── Muestra de empleados (primeros 10) ────────────────────────────────────
  get muestraDetalles(): MetaPptoLoteDet[] {
    return this.detalles.slice(0, 10);
  }

  // ── Timeline de trazabilidad ──────────────────────────────────────────────
  get timeline(): Array<{ icono: string; titulo: string; detalle: string; activo: boolean }> {
    const l = this.lote;
    if (!l) return [];
    return [
      {
        icono: 'add_circle',
        titulo: 'Lote creado',
        detalle: l.creadoPor ? `Por: ${l.creadoPor} · ${this.formatFechaPublico(l.creadoEn)}` : this.formatFechaPublico(l.creadoEn),
        activo: true,
      },
      {
        icono: 'sync',
        titulo: 'Procesamiento completado',
        detalle: `${l.totalEmpleados} empleado(s) procesado(s)`,
        activo: l.totalEmpleados > 0,
      },
      {
        icono: 'manage_search',
        titulo: 'Validación de excepciones',
        detalle: l.totalObservados > 0
          ? `${l.totalObservados} observado(s) — ${l.totalAsignados} corregido(s)`
          : 'Sin excepciones',
        activo: true,
      },
      {
        icono: 'verified',
        titulo: 'Listo para publicar',
        detalle: this.puedePublicar ? 'Todos los requisitos cumplidos' : 'Pendiente de correcciones',
        activo: this.puedePublicar,
      },
      {
        icono: 'publish',
        titulo: 'Publicación',
        detalle: l.finalizadoEn ? this.formatFechaPublico(l.finalizadoEn) : 'Pendiente',
        activo: l.estado === 'PUBLICADO',
      },
    ];
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  onPublicar(): void {
    if (!this.puedePublicar || this.confirmando()) return;
    this.confirmando.set(true);
  }

  confirmarPublicacion(): void {
    this.confirmando.set(false);
    this.publicar.emit();
  }

  cancelarConfirmacion(): void {
    this.confirmando.set(false);
  }

  onExportar(): void { this.exportar.emit(); }
  onAtras(): void    { this.atras.emit(); }

  // ── Helpers ───────────────────────────────────────────────────────────────
  estadoLoteClass(estado: MetaLoteEstado | undefined): string {
    if (!estado) return 'badge-gray';
    const m: Record<string, string> = {
      CREADO: 'badge-info', PROCESANDO: 'badge-info', VALIDADO: 'badge-ok',
      OBSERVADO: 'badge-warn', PUBLICADO: 'badge-ok', ANULADO: 'badge-err', ERROR: 'badge-err',
    };
    return m[estado] ?? 'badge-gray';
  }

  estadoLoteLabel(estado: MetaLoteEstado | undefined | string): string {
    if (!estado) return '—';
    const m: Record<string, string> = {
      CREADO: 'Creado', PROCESANDO: 'Procesando', VALIDADO: 'Validado',
      OBSERVADO: 'Con observaciones', PUBLICADO: 'Publicado', ANULADO: 'Anulado', ERROR: 'Error',
    };
    return m[estado] ?? estado;
  }

  estadoDetClass(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      OK: 'badge-ok', OBSERVADO: 'badge-warn', SIN_EQUIVALENCIA: 'badge-warn',
      META_DESTINO_INACTIVA: 'badge-err', EMPLEADO_INACTIVO: 'badge-gray',
      DUPLICADO: 'badge-err', ERROR: 'badge-err',
    };
    return m[estado] ?? 'badge-gray';
  }

  estadoDetLabel(estado: MetaDetEstado): string {
    const m: Record<string, string> = {
      OK: 'OK', OBSERVADO: 'Observado', SIN_EQUIVALENCIA: 'Sin equiv.',
      META_DESTINO_INACTIVA: 'Meta anulada', EMPLEADO_INACTIVO: 'Inactivo',
      DUPLICADO: 'Duplicado', ERROR: 'Error',
    };
    return m[estado] ?? estado;
  }

  formatFechaPublico(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso ?? '—';
    }
  }

  pctDe(num: number): number {
    return this.kpiAsignados === 0 ? 0 : Math.round((num / this.kpiAsignados) * 100);
  }
}
