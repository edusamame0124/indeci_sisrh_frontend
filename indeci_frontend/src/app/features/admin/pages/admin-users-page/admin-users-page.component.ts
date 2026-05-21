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
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import type { AdminUserSummary } from '../../models/admin.models';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

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
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__group">Administración</span>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Usuarios</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>Usuarios</mat-card-title>
          <mat-card-subtitle>
            Gestión institucional de cuentas (requiere servidor en ruta /api/admin)
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="toolbar sisrh-toolbar">
            <mat-form-field appearance="outline" class="toolbar__search">
              <mat-label>Buscar por usuario</mat-label>
              <input
                matInput
                type="search"
                [value]="filterQ()"
                (input)="onQ($event)"
                aria-label="Filtro búsqueda usuario"
              />
              <mat-icon matSuffix fontIcon="search" aria-hidden="true" />
            </mat-form-field>
            <span class="toolbar__count" role="status" aria-live="polite">
              {{ total() }} registro{{ total() === 1 ? '' : 's' }}
            </span>
            <div class="toolbar__actions">
              <button mat-flat-button color="primary" type="button" routerLink="/admin/usuarios/nueva">
                <mat-icon fontIcon="person_add" aria-hidden="true" />
                Nuevo usuario
              </button>
            </div>
          </div>

          @if (loading()) {
            <div class="page-loading" aria-busy="true">
              <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando usuarios" />
            </div>
          } @else if (loadError()) {
            <app-empty-state
              variant="error"
              icon="error_outline"
              title="No se pudo cargar la información"
              [description]="loadError()!"
            >
              <button mat-stroked-button type="button" (click)="reload()">Reintentar</button>
            </app-empty-state>
          } @else if (total() === 0 && !filterQ().trim()) {
            <app-empty-state
              icon="group"
              title="Sin usuarios registrados"
              description="Aún no hay cuentas institucionales. Registre el primer usuario para comenzar."
            >
              <button mat-flat-button color="primary" type="button" routerLink="/admin/usuarios/nueva">
                <mat-icon fontIcon="person_add" aria-hidden="true" />
                Nuevo usuario
              </button>
            </app-empty-state>
          } @else if (rows().length === 0) {
            <app-empty-state
              icon="search_off"
              title="Sin coincidencias"
              [description]="'No se encontraron usuarios para: ' + filterQ() + '. Revise el filtro e intente de nuevo.'"
            />
          } @else {
            <div class="sisrh-table-scroll">
              <table mat-table class="tbl" [dataSource]="rows()">
                <ng-container matColumnDef="username">
                  <th mat-header-cell *matHeaderCellDef scope="col">Usuario</th>
                  <td mat-cell *matCellDef="let row">{{ row.username }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                  <td mat-cell *matCellDef="let row">
                    @if (row.status?.toUpperCase() === 'ACTIVE') {
                      <span class="sisrh-badge sisrh-badge--success">Activo</span>
                    } @else if (row.status?.toUpperCase() === 'INACTIVE') {
                      <span class="sisrh-badge sisrh-badge--neutral">Inactivo</span>
                    } @else {
                      {{ row.status }}
                    }
                  </td>
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
    </div>
  `,
})
export class AdminUsersPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly columns = ['username', 'status', 'acciones'] as const;
  readonly rows = signal<readonly AdminUserSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
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
    this.loadError.set(null);
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
    this.rows.set([]);
    this.total.set(0);
    this.telemetry.track('ADMIN_MODULE_UI', {
      extra: { action: 'USERS_PAGE_LOAD_FAIL', status: err.status },
      status: err.status,
    });
    const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
    this.loadError.set(this.errors.translateAdminApi(raw));
  }
}
