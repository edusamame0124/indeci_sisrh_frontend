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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import type { AdminPermisoRow } from '../../models/admin.models';

@Component({
  selector: 'app-admin-permisos-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
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
        <span class="crumbs__here">Permisos</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>Permisos</mat-card-title>
          <mat-card-subtitle>Catálogo de permisos (solo lectura)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="page-hint" role="status">
            Listado completo desde el servidor; la paginación se aplica en su equipo.
          </p>

          @if (!loading() && !loadError()) {
            <div class="toolbar sisrh-toolbar">
              <mat-form-field appearance="outline" class="toolbar__search">
                <mat-label>Buscar</mat-label>
                <input
                  matInput
                  type="search"
                  autocomplete="off"
                  [value]="searchQuery()"
                  (input)="onSearchInput($event)"
                  aria-label="Buscar permisos por código o nombre"
                />
                <mat-icon matSuffix fontIcon="search" aria-hidden="true" />
              </mat-form-field>
              <span class="toolbar__count" role="status" aria-live="polite">
                {{ filteredRows().length }} de {{ rows().length }} registros
              </span>
            </div>
          }

          @if (loading()) {
            <div class="page-loading" aria-busy="true">
              <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando permisos" />
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
          } @else if (rows().length === 0) {
            <app-empty-state
              icon="admin_panel_settings"
              title="Sin permisos registrados"
              description="No hay permisos disponibles en el servidor."
            />
          } @else if (filteredRows().length === 0) {
            <app-empty-state
              icon="search_off"
              title="Sin coincidencias"
              [description]="'No se encontraron permisos para: ' + searchQuery() + '. Revise el texto e intente de nuevo.'"
            />
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
              [length]="filteredRows().length"
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
    </div>
  `,
})
export class AdminPermisosPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly cols = ['codigo', 'nombre'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<readonly AdminPermisoRow[]>([]);
  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (r) => r.codigo.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q),
    );
  });

  readonly pagedDisplayed = computed(() => {
    const list = this.filteredRows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'PERM_PAGE_LOAD' } });
    this.api.listPermisos().subscribe({
      next: (r) => {
        this.rows.set(r);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.rows.set([]);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.loadError.set(this.errors.translateAdminApi(raw));
      },
    });
  }

  onSearchInput(ev: Event): void {
    this.searchQuery.set((ev.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }
}
