import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MetaPptoApiService } from '../../../../services/meta-ppto-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { EquivalenciaFormDialogComponent } from './components/equivalencia-form-dialog/equivalencia-form-dialog.component';
import type {
  DeteccionEquivResult,
  MetaPptoCat,
  MetaPptoEquiv,
} from '../../../../models/meta-ppto.model';

// ─── Dialog de confirmación para anular equivalencia ───────────────────────
@Component({
  selector: 'app-anular-equiv-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Anular equivalencia</h2>
    <mat-dialog-content>
      <p class="msg">
        ¿Confirma la anulación de la equivalencia
        <strong>{{ data.origen }}</strong> → <strong>{{ data.destino }}</strong>?
      </p>
      <mat-form-field appearance="outline" subscriptSizing="fixed" style="width:100%">
        <mat-label>Motivo (opcional)</mat-label>
        <textarea matInput [formControl]="motivo" rows="2" maxlength="500"
          placeholder="Indique el motivo de anulación…"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn"
        [mat-dialog-close]="motivo.value || 'Anulado por usuario'"
        style="margin-left:8px">
        <mat-icon>link_off</mat-icon> Anular equivalencia
      </button>
    </mat-dialog-actions>
  `,
  styles: ['.msg { margin: 0 0 16px; font-size: 14px; color: #1f2937; line-height: 1.5; }'],
})
class AnularEquivDialogComponent {
  readonly motivo = new FormControl('');
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: { origen: string; destino: string },
  ) {}
}

// ─── Componente principal ───────────────────────────────────────────────────
const ANIO_ACTUAL = new Date().getFullYear();

@Component({
  selector: 'app-equivalencias-meta-tab',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    MatButtonModule,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equivalencias-meta-tab.component.html',
  styleUrl: './equivalencias-meta-tab.component.css',
})
export class EquivalenciasMetaTabComponent implements OnChanges {
  @Input() anioFiscal = 0;

  private readonly api    = inject(MetaPptoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);
  private readonly notif  = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  // ── Datos ──
  readonly equivalencias       = signal<MetaPptoEquiv[]>([]);
  readonly deteccionResultados = signal<DeteccionEquivResult[]>([]);
  readonly metasOrigen         = signal<MetaPptoCat[]>([]);
  readonly metasDestino        = signal<MetaPptoCat[]>([]);

  // ── Estado UI ──
  readonly loading       = signal(false);
  readonly detectando    = signal(false);
  readonly modoDeteccion = signal(false);
  readonly anioOrigen    = signal(ANIO_ACTUAL);
  readonly filtroEstado  = signal('');
  readonly filtroBusqueda = signal('');
  readonly currentPage   = signal(0);
  readonly pageSize      = 20;

  // ── Columnas ──
  readonly columnasDeteccion = [
    'metaOrigen', 'centroCosto', 'categoria', 'trabajadores',
    'metaDestino', 'estadoDeteccion', 'observacion', 'acciones',
  ] as const;

  readonly columnasEquiv = [
    'origenCodigo', 'origenDesc', 'metaDestino', 'estado', 'acciones',
  ] as const;

  // ── KPIs (modo detección) ──
  get totalOrigen(): number {
    return this.modoDeteccion()
      ? this.deteccionResultados().length
      : this.equivalencias().filter(e => e.estado !== 'ANULADO').length;
  }
  get totalDetectadas(): number {
    return this.deteccionResultados().filter(r => r.estadoDeteccion === 'OK_AUTOMATICO').length;
  }
  get totalObservadas(): number {
    return this.deteccionResultados().filter(
      r => r.estadoDeteccion === 'COINCIDENCIA_MULTIPLE' || r.estadoDeteccion === 'OBSERVADO',
    ).length;
  }
  get totalPendientes(): number {
    return this.deteccionResultados().filter(r => r.estadoDeteccion === 'SIN_COINCIDENCIA').length;
  }

  // ── Datos filtrados ──
  get deteccionFiltrada(): DeteccionEquivResult[] {
    const busq   = this.filtroBusqueda().toLowerCase();
    const estado = this.filtroEstado();
    return this.deteccionResultados().filter(r => {
      if (estado && r.estadoDeteccion !== estado) return false;
      if (busq && !(
        r.metaOrigenCodigo.toLowerCase().includes(busq) ||
        r.centroCosto.toLowerCase().includes(busq) ||
        (r.metaDestinoCodigo?.toLowerCase().includes(busq) ?? false)
      )) return false;
      return true;
    });
  }

  get deteccionPaginada(): DeteccionEquivResult[] {
    const ini = this.currentPage() * this.pageSize;
    return this.deteccionFiltrada.slice(ini, ini + this.pageSize);
  }

  get equivalenciasFiltradas(): MetaPptoEquiv[] {
    const busq = this.filtroBusqueda().toLowerCase();
    if (!busq) return this.equivalencias();
    return this.equivalencias().filter(e =>
      (e.metaOrigenCodigo ?? '').toLowerCase().includes(busq) ||
      (e.metaDestinoCodigo ?? '').toLowerCase().includes(busq) ||
      (e.metaOrigenDescripcion ?? '').toLowerCase().includes(busq),
    );
  }

  get equivalenciasPaginadas(): MetaPptoEquiv[] {
    const ini = this.currentPage() * this.pageSize;
    return this.equivalenciasFiltradas.slice(ini, ini + this.pageSize);
  }

  get inicioReg(): number { return this.currentPage() * this.pageSize + 1; }
  get finReg(): number {
    const total = this.modoDeteccion() ? this.deteccionFiltrada.length : this.equivalenciasFiltradas.length;
    return Math.min((this.currentPage() + 1) * this.pageSize, total);
  }
  get totalFiltrado(): number {
    return this.modoDeteccion() ? this.deteccionFiltrada.length : this.equivalenciasFiltradas.length;
  }

  // ── Lifecycle ──
  ngOnChanges(): void {
    if (this.anioFiscal > 0) {
      this.cargar();
      this.cargarCatalogos();
    }
  }

  cargar(): void {
    this.loading.set(true);
    this.currentPage.set(0);
    this.api.listarEquivalencias(this.anioOrigen(), this.anioFiscal).subscribe({
      next: data => { this.equivalencias.set(data); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.mostrarError(err); },
    });
  }

  cargarCatalogos(): void {
    this.api.listarCatalogo(this.anioOrigen()).subscribe({
      next: metas => this.metasOrigen.set(metas.filter(m => m.estado === 'PUBLICADO')),
      error: () => {},
    });
    this.api.listarCatalogo(this.anioFiscal).subscribe({
      next: metas => this.metasDestino.set(metas.filter(m => m.estado !== 'ANULADO')),
      error: () => {},
    });
  }

  // ── Detección automática ──
  detectarAuto(): void {
    if (this.detectando()) return;
    this.detectando.set(true);
    this.api.detectarEquivalenciasAuto(this.anioOrigen(), this.anioFiscal).subscribe({
      next: resultados => {
        this.detectando.set(false);
        this.deteccionResultados.set(resultados);
        this.modoDeteccion.set(true);
        this.currentPage.set(0);
        this.filtroEstado.set('');
        this.filtroBusqueda.set('');
        const ok = resultados.filter(r => r.estadoDeteccion === 'OK_AUTOMATICO').length;
        this.notif.exito(
          `Detección completada: ${ok} de ${resultados.length} meta(s) emparejadas automáticamente.`,
        );
        this.cargar();
      },
      error: (err: HttpErrorResponse) => { this.detectando.set(false); this.mostrarError(err); },
    });
  }

  volverAEquivalencias(): void {
    this.modoDeteccion.set(false);
    this.filtroEstado.set('');
    this.filtroBusqueda.set('');
    this.currentPage.set(0);
  }

  onAnioOrigenChange(anio: number): void {
    this.anioOrigen.set(anio);
    this.modoDeteccion.set(false);
    this.deteccionResultados.set([]);
    this.cargar();
    this.api.listarCatalogo(anio).subscribe({
      next: metas => this.metasOrigen.set(metas.filter(m => m.estado === 'PUBLICADO')),
      error: () => {},
    });
  }

  onPage(event: PageEvent): void { this.currentPage.set(event.pageIndex); }

  limpiarFiltros(): void {
    this.filtroEstado.set('');
    this.filtroBusqueda.set('');
    this.currentPage.set(0);
  }

  // ── Dialogs ──
  abrirFormEquiv(): void {
    const ref = this.dialog.open(EquivalenciaFormDialogComponent, {
      data: {
        anioOrigen:   this.anioOrigen(),
        anioDestino:  this.anioFiscal,
        metasOrigen:  this.metasOrigen(),
        metasDestino: this.metasDestino(),
      },
      width: '560px',
      disableClose: true,
    });
    ref.afterClosed().subscribe(r => { if (r) this.cargar(); });
  }

  anular(equiv: MetaPptoEquiv): void {
    const ref = this.dialog.open(AnularEquivDialogComponent, {
      data: {
        origen:  equiv.metaOrigenCodigo ?? '—',
        destino: equiv.metaDestinoCodigo ?? '—',
      },
      width: '440px',
    });
    ref.afterClosed().subscribe((motivo: string | undefined) => {
      if (!motivo) return;
      this.api.anularEquivalencia(equiv.id, motivo).subscribe({
        next: () => { this.notif.exito('Equivalencia anulada correctamente.'); this.cargar(); },
        error: (err: HttpErrorResponse) => this.mostrarError(err),
      });
    });
  }

  // ── Helpers de estilo ──
  estadoEquivClass(estado: string): string {
    const m: Record<string, string> = {
      BORRADOR: 'badge-warn', VALIDADO: 'badge-info',
      PUBLICADO: 'badge-ok', ANULADO: 'badge-err',
    };
    return m[estado] ?? 'badge-gray';
  }

  estadoEquivLabel(estado: string): string {
    const m: Record<string, string> = {
      BORRADOR: 'Borrador', VALIDADO: 'Validado',
      PUBLICADO: 'Publicado', ANULADO: 'Anulado',
    };
    return m[estado] ?? estado;
  }

  estadoDeteccionClass(estado: string): string {
    const m: Record<string, string> = {
      OK_AUTOMATICO: 'badge-ok',
      SIN_COINCIDENCIA: 'badge-err',
      COINCIDENCIA_MULTIPLE: 'badge-warn',
      OBSERVADO: 'badge-warn',
    };
    return m[estado] ?? 'badge-gray';
  }

  estadoDeteccionLabel(estado: string): string {
    const m: Record<string, string> = {
      OK_AUTOMATICO: 'Detectada',
      SIN_COINCIDENCIA: 'Sin coincidencia',
      COINCIDENCIA_MULTIPLE: 'Múltiple',
      OBSERVADO: 'Observada',
    };
    return m[estado] ?? estado;
  }

  private mostrarError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
  }
}
