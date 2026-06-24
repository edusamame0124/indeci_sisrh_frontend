import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  sisrhConfirmDialogConfig,
  sisrhFormDialogConfig,
} from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { hasPlanillaWrite } from '../../../../core/guards/planilla-access.guard';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { PlanillaTipoApiService } from '../../services/planilla-tipo-api.service';
import type {
  PlanillaTipo,
  PlanillaTipoInput,
} from '../../models/planilla-tipo.model';
import {
  PlanillaTipoFormDialogComponent,
  type PlanillaTipoFormDialogData,
} from '../../components/planilla-tipo-form-dialog/planilla-tipo-form-dialog.component';

/**
 * Pantalla "Tipos de planilla" (SPEC_CONCEPTOS_PLANILLA §15 — Fase A).
 *
 * <p>Catálogo administrable del dominio Planilla: tabla + alta/editar + baja
 * lógica, reusando el patrón de catálogos del proyecto. Escritura PLA_WRITE.</p>
 *
 * <p>Ruta: {@code /planilla/tipos-planilla}.</p>
 */
@Component({
  selector: 'app-planilla-tipo-catalog-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planilla-tipo-catalog-page.component.html',
  styleUrl: './planilla-tipo-catalog-page.component.css',
})
export class PlanillaTipoCatalogPageComponent {
  private readonly api = inject(PlanillaTipoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly notificacion = inject(NotificacionService);
  private readonly auth = inject(AuthService);

  /** PLA_WRITE habilita alta/edición/baja del catálogo. */
  readonly canWrite = computed(() => hasPlanillaWrite([...this.auth.roles()]));

  readonly baseCols = ['codigo', 'nombre', 'orden'] as const;
  readonly displayCols = computed(() =>
    this.canWrite() ? [...this.baseCols, 'acciones'] : [...this.baseCols],
  );

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<readonly PlanillaTipo[]>([]);
  readonly filterText = signal('');

  readonly displayed = computed(() => {
    const f = this.filterText().trim().toLowerCase();
    const list = this.rows();
    if (!f) return list;
    return list.filter(
      (t) =>
        t.codigo.toLowerCase().includes(f) ||
        t.nombre.toLowerCase().includes(f),
    );
  });

  constructor() {
    this.reload();
  }

  onFilter(ev: Event): void {
    this.filterText.set((ev.target as HTMLInputElement).value);
  }

  openCreate(): void {
    if (!this.canWrite()) return;
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'PLANILLA_TIPO_CREATE_OPEN' } });
    const data: PlanillaTipoFormDialogData = {
      title: 'Nuevo tipo de planilla',
      modo: 'crear',
      submitLabel: 'Guardar',
      initial: null,
    };
    const ref = this.dialog.open(
      PlanillaTipoFormDialogComponent,
      sisrhFormDialogConfig('sm', { data }),
    );
    ref.afterClosed().subscribe((body: PlanillaTipoInput | undefined) => {
      if (!body) return;
      this.api.crear(body).subscribe({
        next: () => {
          this.notificacion.exito('Tipo de planilla registrado correctamente.');
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'PLANILLA_TIPO_CREATE_FAIL'),
      });
    });
  }

  openEdit(row: PlanillaTipo): void {
    if (!this.canWrite()) return;
    this.telemetry.track('CATALOG_ADMIN_UI', {
      extra: { action: 'PLANILLA_TIPO_EDIT_OPEN', codigo: row.codigo },
    });
    const data: PlanillaTipoFormDialogData = {
      title: `Editar planilla ${row.codigo}`,
      modo: 'editar',
      submitLabel: 'Guardar cambios',
      initial: {
        codigo: row.codigo,
        nombre: row.nombre,
        orden: row.orden,
        activo: row.activo,
      },
    };
    const ref = this.dialog.open(
      PlanillaTipoFormDialogComponent,
      sisrhFormDialogConfig('sm', { data }),
    );
    ref.afterClosed().subscribe((body: PlanillaTipoInput | undefined) => {
      if (!body) return;
      this.api.actualizar(row.codigo, body).subscribe({
        next: () => {
          this.notificacion.exito('Tipo de planilla actualizado correctamente.');
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'PLANILLA_TIPO_EDIT_FAIL'),
      });
    });
  }

  confirmDelete(row: PlanillaTipo): void {
    if (!this.canWrite()) return;
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Dar de baja tipo de planilla',
        message: `¿Confirmas la baja de la planilla "${row.nombre}" (${row.codigo})? Los conceptos ya asociados conservan su histórico.`,
        confirmLabel: 'Dar de baja',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (!ok) return;
      this.api.eliminar(row.codigo).subscribe({
        next: () => {
          this.notificacion.exito('Tipo de planilla dado de baja correctamente.');
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'PLANILLA_TIPO_DELETE_FAIL'),
      });
    });
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listar().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.rows.set([]);
        this.loadError.set(this.resolveLoadError(e));
        this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'PLANILLA_TIPO_LOAD_FAIL' } });
      },
    });
  }

  private resolveLoadError(err: unknown): string {
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      return this.errors.translate(err.error.mensaje);
    }
    return this.errors.translate(null);
  }

  private handleWriteError(err: unknown, action: string): void {
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action } });
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      this.snack.open(this.errors.translate(err.error.mensaje), 'Cerrar', { duration: 6000 });
      return;
    }
    this.snack.open(this.errors.translate(null), 'Cerrar', { duration: 6000 });
  }
}
