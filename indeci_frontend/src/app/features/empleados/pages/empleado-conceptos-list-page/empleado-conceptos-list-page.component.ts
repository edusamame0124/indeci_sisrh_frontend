import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhConfirmDialogConfig, sisrhFormDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmpleadoConceptoFormDialogComponent } from '../../components/empleado-concepto-form-dialog/empleado-concepto-form-dialog.component';
import { EmpleadoFlowWarningBannerComponent } from '../../components/empleado-flow-warning-banner/empleado-flow-warning-banner.component';
import { EmpleadoConceptoApiService } from '../../services/empleado-concepto-api.service';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { EmpleadoConceptoInput, EmpleadoConceptoRow } from '../../models/empleado-concepto.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-empleado-conceptos-list-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    EmpleadoFlowWarningBannerComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-conceptos-list-page.component.html',
  styleUrl: './empleado-conceptos-list-page.component.css',
})
export class EmpleadoConceptosListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly personaApi = inject(PersonaApiService);
  private readonly conceptoApi = inject(EmpleadoConceptoApiService);
  private readonly empleadoFlow = inject(EmpleadoFlowService);
  private readonly flowBackendSync = inject(EmpleadoFlowBackendSyncService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'concepto',
    'monto',
    'porcentaje',
    'formula',
    'activo',
    'acciones',
  ] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly pageLoading = signal(true);
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly rows = signal<readonly EmpleadoConceptoRow[]>([]);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly empleadoId = computed(() => {
    const p = this.persona();
    const id = p?.empleadoId;
    return id != null && id > 0 ? id : null;
  });

  /** Spec 009 / T142 — personaId derivado para el banner soft. */
  readonly personaId = computed(() => this.persona()?.id ?? 0);

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly idsConceptosAsignados = computed(
    () => new Set(this.rows().map((r) => r.conceptoPlanillaId)),
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => Number(p.get('personaId'))),
        switchMap((id) => {
          if (!Number.isFinite(id) || id < 1) {
            this.pageLoading.set(false);
            this.persona.set(null);
            this.rows.set([]);
            return EMPTY;
          }
          this.pageLoading.set(true);
          this.rows.set([]);
          return this.personaApi.obtenerPorId(id);
        }),
      )
      .subscribe({
        next: (dto) => {
          this.empleadoFlow.hydrateFromPersona(dto);
          const eid = dto.empleadoId != null && dto.empleadoId > 0 ? dto.empleadoId : null;
          if (eid != null) {
            this.flowBackendSync.syncCompletedStepsFromBackend(eid).subscribe({
              next: () => {
                this.persona.set(dto);
                this.pageLoading.set(false);
                this.loadConceptos(eid);
              },
              error: () => {
                this.persona.set(dto);
                this.pageLoading.set(false);
                this.loadConceptos(eid);
              },
            });
            return;
          }
          this.persona.set(dto);
          this.pageLoading.set(false);
        },
        error: (err: HttpErrorResponse) => this.onFail(err),
      });
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  fmtMonto(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  fmtPct(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value}%`;
  }

  fmtFormula(value: string | null): string {
    if (value == null || value.trim() === '') return '—';
    return value;
  }

  fmtActivo(activo: number): string {
    return activo === 1 ? 'Sí' : 'No';
  }

  abrirAlta(): void {
    const eid = this.empleadoId();
    if (eid == null) return;
    const ref = this.dialogs.open(
      EmpleadoConceptoFormDialogComponent,
      sisrhFormDialogConfig('md', {
        data: {
          empleadoId: eid,
          title: 'Asignar Descuento / Ajuste Manual',
          submitLabel: 'Guardar',
          conceptosYaAsignadosIds: this.idsConceptosAsignados(),
        },
      }),
    );
    void ref.afterClosed().subscribe((body: EmpleadoConceptoInput | undefined) => {
      if (body == null) return;
      this.conceptoApi.guardar(body).subscribe({
        next: () => {
          this.snack.open('Concepto asignado correctamente.', 'Cerrar', { duration: 4000 });
          this.loadConceptos(eid);
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
    });
  }

  abrirEditar(row: EmpleadoConceptoRow): void {
    const eid = this.empleadoId();
    if (eid == null) return;
    const ref = this.dialogs.open(
      EmpleadoConceptoFormDialogComponent,
      sisrhFormDialogConfig('md', {
        data: {
          empleadoId: eid,
          title: 'Editar concepto asignado',
          submitLabel: 'Actualizar',
          registro: row,
          conceptosYaAsignadosIds: this.idsConceptosAsignados(),
        },
      }),
    );
    void ref.afterClosed().subscribe((body: EmpleadoConceptoInput | undefined) => {
      if (body == null) return;
      this.conceptoApi.actualizar(row.id, body).subscribe({
        next: () => {
          this.snack.open('Concepto actualizado correctamente.', 'Cerrar', { duration: 4000 });
          this.loadConceptos(eid);
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
    });
  }

  confirmEliminar(row: EmpleadoConceptoRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar concepto asignado',
        message: `Se eliminará el concepto "${row.concepto}". ¿Continuar?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private eliminar(id: number): void {
    const eid = this.empleadoId();
    if (eid == null) return;
    this.conceptoApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Concepto eliminado correctamente.', 'Cerrar', { duration: 4000 });
        this.loadConceptos(eid);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private loadConceptos(eid: number): void {
    this.tableLoading.set(true);
    this.conceptoApi.listarPorEmpleado(eid).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.clampPageIndex(list.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.onHttpSnack(err);
      },
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

  private onFail(err: HttpErrorResponse): void {
    this.pageLoading.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
