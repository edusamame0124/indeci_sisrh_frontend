import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhConfirmDialogConfig, sisrhFormDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { PeriodoEstadoBadgeComponent } from '../../components/periodo-estado-badge/periodo-estado-badge.component';
import { PeriodoFormDialogComponent } from '../../components/periodo-form-dialog/periodo-form-dialog.component';
import type {
  PeriodoFormDialogData,
} from '../../components/periodo-form-dialog/periodo-form-dialog.component';
import type {
  PeriodoPlanillaInput,
  PeriodoPlanillaRow,
} from '../../models/periodo-planilla.model';

/**
 * Listado y administración de periodos de planilla (Spec 009 / T152, Spec 011 / B7).
 * Acción por fila: "Gestionar" (abre el ciclo de vida del período) y "Eliminar".
 * Las transiciones ABIERTO→EN_REVISION→APROBADO→CERRADO viven en la página de
 * ciclo de vida (`/planilla/cierre/:id`).
 */
@Component({
  selector: 'app-periodos-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    PeriodoEstadoBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './periodos-page.component.html',
  styleUrl: './periodos-page.component.css',
})
export class PeriodosPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly router = inject(Router);

  readonly columns = ['periodo', 'fechaInicio', 'fechaFin', 'estado', 'observacion', 'acciones'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly rows = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly loading = signal(true);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly periodosYaRegistrados = computed(() => new Set(this.rows().map((r) => r.periodo)));

  ngOnInit(): void {
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  abrirAlta(): void {
    const data: PeriodoFormDialogData = {
      title: 'Nuevo periodo',
      submitLabel: 'Crear periodo',
      periodosYaRegistrados: this.periodosYaRegistrados(),
    };
    const ref = this.dialogs.open(PeriodoFormDialogComponent, sisrhFormDialogConfig('md', { data }));
    void ref.afterClosed().subscribe((body: PeriodoPlanillaInput | null | undefined) => {
      if (!body) return;
      this.crear(body);
    });
  }

  /** Abre la página de ciclo de vida del período (revisión / aprobación / cierre). */
  gestionar(row: PeriodoPlanillaRow): void {
    void this.router.navigate(['/planilla/cierre', row.id]);
  }

  confirmEliminar(row: PeriodoPlanillaRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar periodo',
        message: `Se eliminará el periodo ${row.periodo}. ¿Continuar?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.periodoApi.listar().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.clampPageIndex(list.length);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private crear(body: PeriodoPlanillaInput): void {
    this.periodoApi.crear(body).subscribe({
      next: () => {
        this.snack.open('Periodo creado correctamente.', 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private eliminar(id: number): void {
    this.periodoApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Periodo eliminado.', 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
