import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { AdminPermisoRow } from '../../models/admin.models';

@Component({
  selector: 'app-admin-permisos-page',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatProgressSpinnerModule, MatPaginatorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="card">
      <mat-card-header>
        <mat-card-title>Permisos</mat-card-title>
        <mat-card-subtitle>Catálogo de permisos (solo lectura)</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p class="hint" role="status">
          Listado completo desde el servidor; la paginación es en el equipo.
        </p>
        @if (loading()) {
          <div class="spin">
            <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando permisos" />
          </div>
        } @else {
          <div class="sisrh-table-scroll">
          <table mat-table class="tbl" [dataSource]="pagedDisplayed()">
            <ng-container matColumnDef="codigo">
              <th mat-header-cell *matHeaderCellDef scope="col">Código</th>
              <td mat-cell *matCellDef="let row">{{ row.codigo }}</td>
            </ng-container>
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef scope="col">Nombre</th>
              <td mat-cell *matCellDef="let row">{{ row.nombre }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
          </div>
          <mat-paginator
            [length]="displayed().length"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="pageSizeOptions"
            (page)="onPage($event)"
            showFirstLastButtons
            aria-label="Paginador de permisos"
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
      .tbl {
        width: 100%;
      }
      .spin {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .hint {
        font-size: 0.875rem;
        color: #475569;
        margin: 0 0 1rem;
      }
    `,
  ],
})
export class AdminPermisosPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly cols = ['codigo', 'nombre'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly loading = signal(true);
  readonly rows = signal<readonly AdminPermisoRow[]>([]);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly displayed = computed(() => this.rows());

  readonly pagedDisplayed = computed(() => {
    const list = this.displayed();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'PERM_PAGE_LOAD' } });
    this.api.listPermisos().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }
}
