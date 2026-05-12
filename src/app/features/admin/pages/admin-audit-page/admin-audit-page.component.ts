import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminApiService, type AdminAuditQuery } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import {
  sanitizeAuditAccionFilter,
  sanitizeAuditIpFilter,
  sanitizeAuditUsuarioFilter,
} from '../../../../core/utils/audit-query-sanitize';
import type { AdminAuditoriaRow } from '../../models/admin.models';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { auditoriaCsvFileName, buildAuditoriaCsv } from '../../utils/audit-csv-export';

function formatDatePicker(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-admin-audit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="card">
      <mat-card-header>
        <mat-card-title>Consulta de auditoría</mat-card-title>
        <mat-card-subtitle>Lectura consultiva (append-only en base de datos). Exportación CSV acotada.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="filterForm" class="filters" (ngSubmit)="aplicarFiltros()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Usuario</mat-label>
            <input matInput formControlName="usuario" maxlength="128" autocomplete="off" aria-label="Filtro usuario" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Acción</mat-label>
            <input matInput formControlName="accion" maxlength="128" autocomplete="off" aria-label="Filtro acción" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput [matDatepicker]="dp1" formControlName="desde" />
            <mat-datepicker-toggle matSuffix [for]="dp1" />
            <mat-datepicker #dp1 />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="dp2" formControlName="hasta" />
            <mat-datepicker-toggle matSuffix [for]="dp2" />
            <mat-datepicker #dp2 />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Dirección IP</mat-label>
            <input matInput formControlName="ip" maxlength="64" autocomplete="off" aria-label="Filtro IP" />
          </mat-form-field>
          <div class="row-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
              Consultar
            </button>
            <button mat-stroked-button type="button" (click)="exportarCsv()" [disabled]="csvBusy()">
              Exportar CSV (máx. 500 filas)
            </button>
          </div>
        </form>

        @if (loading()) {
          <div class="spin"><mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando auditoría" /></div>
        } @else {
          <div class="sisrh-table-scroll" role="region" aria-labelledby="titulo-audit-table" tabindex="0">
            <span id="titulo-audit-table" class="sr-only">Tabla auditoría institucional</span>
            <table mat-table class="tbl" [dataSource]="rows()">
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef scope="col">Fecha</th>
                <td mat-cell *matCellDef="let row">{{ row.fecha }}</td>
              </ng-container>
              <ng-container matColumnDef="usuario">
                <th mat-header-cell *matHeaderCellDef scope="col">Usuario</th>
                <td mat-cell *matCellDef="let row">{{ row.usuario }}</td>
              </ng-container>
              <ng-container matColumnDef="accion">
                <th mat-header-cell *matHeaderCellDef scope="col">Acción</th>
                <td mat-cell *matCellDef="let row">{{ row.accion }}</td>
              </ng-container>
              <ng-container matColumnDef="ip">
                <th mat-header-cell *matHeaderCellDef scope="col">IP</th>
                <td mat-cell *matCellDef="let row">{{ row.ip }}</td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                <td mat-cell *matCellDef="let row">{{ row.estado }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="total()"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            showFirstLastButtons
            aria-label="Paginador auditoría"
          />
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .card {
        margin: 1rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem 1rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        width: 100%;
      }
      .tbl {
        width: 100%;
        min-width: 640px;
      }
      .spin {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }
    `,
  ],
})
export class AdminAuditPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly filterForm = this.fb.group({
    usuario: this.fb.nonNullable.control(''),
    accion: this.fb.nonNullable.control(''),
    desde: this.fb.control<Date | null>(null),
    hasta: this.fb.control<Date | null>(null),
    ip: this.fb.nonNullable.control(''),
  });

  readonly cols = ['fecha', 'usuario', 'accion', 'ip', 'estado'] as const;
  readonly rows = signal<readonly AdminAuditoriaRow[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly csvBusy = signal(false);

  constructor() {
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'AUDIT_PAGE_BOOT' } });
    this.reload();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.reload();
  }

  aplicarFiltros(): void {
    this.pageIndex.set(0);
    this.reload();
  }

  private buildAuditFilters(): Omit<AdminAuditQuery, 'page' | 'size'> {
    const f = this.filterForm.getRawValue();
    return {
      usuario: sanitizeAuditUsuarioFilter(f.usuario),
      accion: sanitizeAuditAccionFilter(f.accion),
      ip: sanitizeAuditIpFilter(f.ip),
      fechaDesde: formatDatePicker(f.desde ?? null),
      fechaHasta: formatDatePicker(f.hasta ?? null),
    };
  }

  private buildQuerySlice(): AdminAuditQuery {
    return {
      ...this.buildAuditFilters(),
      page: this.pageIndex(),
      size: this.pageSize(),
    };
  }

  reload(): void {
    this.loading.set(true);
    this.api.queryAuditoria(this.buildQuerySlice()).subscribe({
      next: (p) => {
        this.rows.set(p.content ?? []);
        this.total.set(p.totalElements);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }

  exportarCsv(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.csvBusy.set(true);
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'AUDIT_EXPORT_CSV_START' } });
    this.api.fetchAuditoriaAllForExport(this.buildAuditFilters()).subscribe({
      next: (rows) => {
        this.csvBusy.set(false);
        if (rows.length === 0) {
          this.snack.open(this.errors.auditoriaCsvExportSinDatos());
          return;
        }

        const body = buildAuditoriaCsv(rows);
        const blob = new Blob([body], {
          type: 'text/csv;charset=utf-8;',
        });

        const url = URL.createObjectURL(blob);

        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = auditoriaCsvFileName(new Date());
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          a.remove();
          this.snack.open(this.errors.auditoriaCsvExportLista());
        } finally {
          URL.revokeObjectURL(url);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.csvBusy.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }
}
