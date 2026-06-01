import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  sisrhConfirmDialogConfig,
  sisrhFormDialogConfig,
} from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EncargaturaApiService } from '../../services/encargatura-api.service';
import type {
  EncargaturaFiltroEstado,
  EncargaturaResponse,
} from '../../models/encargatura.model';
import {
  EncargaturaFormDialogComponent,
  type EncargaturaDialogData,
} from './encargatura-form-dialog.component';

/**
 * F5.2 — Listado y mantenimiento de encargaturas.
 *
 * <p>Ruta: {@code /empleados/encargatura}.</p>
 *
 * <p>Diferencia con F5.1: este listado es GLOBAL (no requiere selección de
 * persona previa). Tiene su propia barra de filtros internos: estado +
 * búsqueda por titular o encargado.</p>
 */
@Component({
  selector: 'app-encargatura-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './encargatura-page.component.html',
  styleUrl: './encargatura-page.component.css',
})
export class EncargaturaPageComponent implements OnInit {
  private readonly api = inject(EncargaturaApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  // ===================== State =====================

  readonly rows = signal<readonly EncargaturaResponse[]>([]);
  readonly loading = signal(true);
  readonly filtroEstado = new FormControl<EncargaturaFiltroEstado>('TODOS', { nonNullable: true });
  readonly buscador = signal<string>('');

  readonly columnas = [
    'titular', 'encargado', 'fechaInicio', 'fechaFin', 'resolucion', 'estado', 'acciones',
  ] as const;

  // ===================== Computed =====================

  readonly filtradas = computed<readonly EncargaturaResponse[]>(() => {
    const q = this.buscador().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) => {
      const blob = `${r.titularNombre ?? ''} ${r.titularDni ?? ''} ${r.encargadoNombre ?? ''} ${r.encargadoDni ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  });

  readonly conteoActivas = computed(() => this.rows().filter((r) => r.estado === 'ACTIVO').length);
  readonly conteoCulminadas = computed(() => this.rows().filter((r) => r.estado === 'CULMINADO').length);

  // ===================== Lifecycle =====================

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.api.listar(this.filtroEstado.value).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.rows.set([]);
        this.onHttp(err);
      },
    });
  }

  onCambioFiltro(): void {
    this.cargar();
  }

  // ===================== Acciones =====================

  abrirRegistrar(): void {
    const ref = this.dialog.open(
      EncargaturaFormDialogComponent,
      sisrhFormDialogConfig<EncargaturaDialogData>('md', { data: {} }),
    );
    void ref.afterClosed().subscribe((r) => {
      if (r) {
        this.snack.open('Encargatura registrada.', 'Cerrar', { duration: 4000 });
        this.cargar();
      }
    });
  }

  abrirEditar(row: EncargaturaResponse): void {
    const ref = this.dialog.open(
      EncargaturaFormDialogComponent,
      sisrhFormDialogConfig<EncargaturaDialogData>('md', { data: { editar: row } }),
    );
    void ref.afterClosed().subscribe((r) => {
      if (r) {
        this.snack.open('Encargatura actualizada.', 'Cerrar', { duration: 4000 });
        this.cargar();
      }
    });
  }

  confirmarCerrar(row: EncargaturaResponse): void {
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Cerrar encargatura',
        message:
          `¿Confirmas el cierre de la encargatura de ${row.encargadoNombre ?? 'el(la) encargado(a)'}? ` +
          'Pasará a estado CULMINADO con la fecha de hoy.',
        confirmLabel: 'Cerrar encargatura',
        cancelLabel: 'Cancelar',
        severity: 'warning',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.cerrar(row);
    });
  }

  private cerrar(row: EncargaturaResponse): void {
    this.api.cerrar(row.id, null).subscribe({
      next: () => {
        this.snack.open('Encargatura culminada.', 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.onHttp(err),
    });
  }

  confirmarEliminar(row: EncargaturaResponse): void {
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar encargatura',
        message:
          `Se eliminará permanentemente el registro de encargatura ` +
          `entre ${row.titularNombre ?? 'titular'} y ${row.encargadoNombre ?? 'encargado(a)'}. ` +
          '¿Continuar?',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row);
    });
  }

  private eliminar(row: EncargaturaResponse): void {
    this.api.eliminar(row.id).subscribe({
      next: () => {
        this.snack.open('Encargatura eliminada.', 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.onHttp(err),
    });
  }

  // ===================== Helpers =====================

  fmtFecha(iso: string | null | undefined): string {
    if (!iso) return '—';
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  private onHttp(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
