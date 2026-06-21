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
import { MetaPptoApiService } from '../../../../services/meta-ppto-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { EmpMetaAnual, MetaEmpEstado } from '../../../../models/meta-ppto.model';

// ─── Dialog de confirmación para anular asignación ────────────────────────
@Component({
  selector: 'app-anular-asig-dialog',
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
    <h2 mat-dialog-title>Anular asignación</h2>
    <mat-dialog-content>
      <p class="msg">
        ¿Confirma la anulación de la asignación de
        <strong>{{ data.empleadoNombre }}</strong>?
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
        <mat-icon>cancel</mat-icon> Anular asignación
      </button>
    </mat-dialog-actions>
  `,
  styles: ['.msg { margin: 0 0 16px; font-size: 14px; color: #1f2937; line-height: 1.5; }'],
})
class AnularAsigDialogComponent {
  readonly motivo = new FormControl('');
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: { empleadoNombre: string },
  ) {}
}

@Component({
  selector: 'app-asignacion-meta-tab',
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
  templateUrl: './asignacion-meta-tab.component.html',
  styleUrl: './asignacion-meta-tab.component.css',
})
export class AsignacionMetaTabComponent implements OnChanges {
  @Input() anioFiscal = 0;

  private readonly api    = inject(MetaPptoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);
  private readonly notif  = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  readonly columnas = [
    'empleadoDni', 'empleadoNombre', 'metaCodigo', 'centroCosto',
    'categoriaPresupuestal', 'actividad', 'finalidad', 'estado', 'origen', 'acciones',
  ] as const;

  readonly asignaciones   = signal<EmpMetaAnual[]>([]);
  readonly loading        = signal(false);
  readonly filtroEstado   = signal<MetaEmpEstado | ''>('');
  readonly filtroOrigen   = signal<'MANUAL' | 'SISTEMA' | ''>('');
  readonly filtroBusqueda = signal('');
  readonly currentPage    = signal(0);
  readonly pageSize       = 25;

  get asignacionesFiltradas(): EmpMetaAnual[] {
    const f = this.filtroBusqueda().toLowerCase();
    const e = this.filtroEstado();
    const o = this.filtroOrigen();
    return this.asignaciones().filter((a) => {
      const pasaEstado   = !e || a.estado === e;
      const pasaOrigen   = !o || a.origen === o;
      const pasaBusqueda = !f
        || (a.empleadoDni ?? '').toLowerCase().includes(f)
        || (a.empleadoNombre ?? '').toLowerCase().includes(f)
        || (a.metaCodigo ?? '').toLowerCase().includes(f)
        || (a.centroCosto ?? '').toLowerCase().includes(f);
      return pasaEstado && pasaOrigen && pasaBusqueda;
    });
  }

  get asignacionesPaginadas(): EmpMetaAnual[] {
    const inicio = this.currentPage() * this.pageSize;
    return this.asignacionesFiltradas.slice(inicio, inicio + this.pageSize);
  }

  get totalFiltrados(): number { return this.asignacionesFiltradas.length; }
  get totalPublicados(): number { return this.asignaciones().filter((a) => a.estado === 'PUBLICADO').length; }
  get totalBorradores(): number { return this.asignaciones().filter((a) => a.estado === 'BORRADOR').length; }
  get totalObservados(): number { return this.asignaciones().filter((a) => a.estado === 'OBSERVADO').length; }

  ngOnChanges(): void {
    if (this.anioFiscal > 0) this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.currentPage.set(0);
    this.api.listarAsignacionesPorAnio(this.anioFiscal).subscribe({
      next: (data) => { this.asignaciones.set(data); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.mostrarError(err); },
    });
  }

  onPage(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroEstado.set('');
    this.filtroOrigen.set('');
    this.currentPage.set(0);
  }

  anular(asig: EmpMetaAnual): void {
    const ref = this.dialog.open(AnularAsigDialogComponent, {
      data: { empleadoNombre: asig.empleadoNombre ?? 'el empleado' },
      width: '440px',
    });
    ref.afterClosed().subscribe((motivo: string | undefined) => {
      if (!motivo) return;
      this.api.anularAsignacion(asig.id, motivo).subscribe({
        next: () => { this.notif.exito('Asignación anulada correctamente.'); this.cargar(); },
        error: (err: HttpErrorResponse) => this.mostrarError(err),
      });
    });
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'badge-warn', PUBLICADO: 'badge-ok', ANULADO: 'badge-err',
      OBSERVADO: 'badge-warn', VALIDADO: 'badge-info', CERRADO: 'badge-gray',
    };
    return mapa[estado] ?? 'badge-gray';
  }

  estadoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'Borrador', PUBLICADO: 'Publicado', ANULADO: 'Anulado',
      OBSERVADO: 'Observado', VALIDADO: 'Validado', CERRADO: 'Cerrado',
    };
    return mapa[estado] ?? estado;
  }

  private mostrarError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
  }
}
