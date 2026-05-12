import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import type { AdminUserSummary } from '../../models/admin.models';
import { isErrorResponse } from '../../../../core/models/error-response.model';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="card">
      <mat-card-header>
        <mat-card-title>Usuarios</mat-card-title>
        <mat-card-subtitle>
          Gestión institucional de cuentas (requiere servidor en ruta /api/admin)
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="toolbar">
          <mat-form-field appearance="outline" class="q">
            <mat-label>Búscar por usuario</mat-label>
            <input
              matInput
              type="search"
              [value]="filterQ()"
              (input)="onQ($event)"
              aria-label="Filtro búsqueda usuario"
            />
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" routerLink="/admin/usuarios/nueva">
            <mat-icon fontIcon="person_add" aria-hidden="true" />
            Nuevo usuario
          </button>
        </div>

        @if (loading()) {
          <div class="loading" aria-busy="true">
            <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando usuarios" />
          </div>
        } @else {
          <div class="sisrh-table-scroll">
            <table mat-table class="tbl" [dataSource]="rows()">
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef scope="col">Usuario</th>
              <td mat-cell *matCellDef="let row">{{ row.username }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
              <td mat-cell *matCellDef="let row">{{ row.status }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
              <td mat-cell *matCellDef="let row">
                <a
                  mat-icon-button
                  [routerLink]="['/admin/usuarios', row.id]"
                  [attr.aria-label]="'Abrir ficha del usuario ' + row.username"
                  [matTooltip]="'Ver y editar ' + row.username"
                >
                  <mat-icon fontIcon="manage_accounts" aria-hidden="true" />
                </a>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>

          @if (rows().length === 0) {
            <p role="status" class="empty-hint">Sin resultados para la página seleccionada.</p>
          }

          <mat-paginator
            [length]="total()"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            showFirstLastButtons
            aria-label="Paginador de usuarios"
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
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      .q {
        flex: 1 1 220px;
        min-width: 200px;
      }
      .tbl {
        width: 100%;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .empty-hint {
        margin: 1rem 0;
        color: #64748b;
      }
    `,
  ],
})
export class AdminUsersPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly snack = inject(MatSnackBar);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly columns = ['username', 'status', 'acciones'] as const;
  readonly rows = signal<readonly AdminUserSummary[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly filterQ = signal('');

  constructor() {
    this.reload();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.reload();
  }

  onQ(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.filterQ.set(v);
    this.pageIndex.set(0);
    this.reloadDebounced?.();
  }

  private reloadTimeout: ReturnType<typeof setTimeout> | null = null;
  private reloadDebounced = (): void => {
    if (this.reloadTimeout) clearTimeout(this.reloadTimeout);
    this.reloadTimeout = setTimeout(() => this.reload(), 350);
  };

  reload(): void {
    this.loading.set(true);
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USERS_PAGE_LOAD' } });
    const qRaw = this.filterQ().trim();
    this.api.listUsersPaged(this.pageIndex(), this.pageSize(), qRaw || undefined).subscribe({
      next: (p) => {
        this.rows.set(p.content ?? []);
        this.total.set(p.totalElements);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  private fail(err: HttpErrorResponse): void {
    this.loading.set(false);
    this.telemetry.track('ADMIN_MODULE_UI', {
      extra: { action: 'USERS_PAGE_LOAD_FAIL', status: err.status },
      status: err.status,
    });
    const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
    this.snack.open(this.errors.translateAdminApi(raw));
  }
}
