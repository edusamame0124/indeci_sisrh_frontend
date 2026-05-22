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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ListDataShellComponent } from '../../../../shared/components/list-data-shell/list-data-shell.component';
import { ListToolbarComponent } from '../../../../shared/components/list-toolbar/list-toolbar.component';
import type { AdminRolRow } from '../../models/admin.models';

@Component({
  selector: 'app-admin-roles-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    ListToolbarComponent,
    ListDataShellComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__group">Administración</span>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Roles</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>Roles institucionales</mat-card-title>
          <mat-card-subtitle>Vista de referencia (solo lectura en MVP)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="page-hint" role="status">
            Listado completo desde el servidor; la paginación se aplica en su equipo.
          </p>

          @if (!loading() && !loadError()) {
            <app-list-toolbar
              [searchQuery]="searchQuery()"
              (searchChange)="onSearchFromToolbar($event)"
              [filteredCount]="filteredRows().length"
              [totalCount]="rows().length"
              searchAriaLabel="Buscar roles por código o nombre"
            />
          }

          <app-list-data-shell
            [loading]="loading()"
            loadingLabel="Cargando roles"
            [errorMessage]="loadError()"
            [totalCount]="rows().length"
            [filteredCount]="filteredRows().length"
            emptyIcon="shield"
            emptyTitle="Sin roles registrados"
            emptyDescription="No hay roles institucionales disponibles en el servidor."
            [noMatchDescription]="
              'No se encontraron roles para: ' +
              searchQuery() +
              '. Revise el texto e intente de nuevo.'
            "
          >
            <button retry mat-stroked-button type="button" (click)="reload()">Reintentar</button>
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
                <ng-container matColumnDef="activo">
                  <th mat-header-cell *matHeaderCellDef scope="col">Activo</th>
                  <td mat-cell *matCellDef="let row">
                    @if (isActivo(row)) {
                      <span class="sisrh-badge sisrh-badge--success">Activo</span>
                    } @else if (row.activo) {
                      <span class="sisrh-badge sisrh-badge--neutral">{{ row.activo }}</span>
                    } @else {
                      —
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="nivel">
                  <th mat-header-cell *matHeaderCellDef scope="col">Nivel</th>
                  <td mat-cell *matCellDef="let row">{{ row.nivel ?? '—' }}</td>
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
              aria-label="Paginador de roles institucionales"
            />
          </app-list-data-shell>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class AdminRolesPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly cols = ['codigo', 'nombre', 'activo', 'nivel'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<readonly AdminRolRow[]>([]);
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
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'ROLES_PAGE_LOAD' } });
    this.api.listRoles().subscribe({
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

  onSearchFromToolbar(value: string): void {
    this.searchQuery.set(value);
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  isActivo(row: AdminRolRow): boolean {
    const v = row.activo?.trim().toUpperCase();
    return v === 'S' || v === 'SI' || v === '1' || v === 'TRUE' || v === 'ACTIVO';
  }
}
