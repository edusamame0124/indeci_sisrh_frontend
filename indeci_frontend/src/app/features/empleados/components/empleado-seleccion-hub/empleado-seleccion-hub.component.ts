import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/** Route `data` for hub pages (cuentas bancarias, pensión, planilla, puesto, conceptos). */
export interface empleadosHubRouteData {
  readonly title: string;
  readonly subtitle: string;
  /** URL segment after `/empleados/`, ej. `cuentas-bancarias` */
  readonly segment: string;
  /**
   * Opt-in: muestra la columna "Régimen" (FASE1 — útil en pantallas tributarias
   * como suspensión de 4ta para identificar CAS). Por defecto false → los demás
   * módulos no se ven afectados.
   */
  readonly showRegimen?: boolean;
}

@Component({
  selector: 'app-empleado-seleccion-hub',
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
    MatTooltipModule,
    MatPaginatorModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__group">Empleados</span>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ hub().title }}</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>{{ hub().title }}</mat-card-title>
          <mat-card-subtitle>{{ hub().subtitle }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="page-hint" role="status">
            Seleccione una persona para continuar. El listado completo viene del servidor.
          </p>

          @if (!loading() && !loadError()) {
            <div class="toolbar sisrh-toolbar">
              <mat-form-field appearance="outline" class="toolbar__search" subscriptSizing="dynamic">
                <mat-label>Buscar</mat-label>
                <mat-icon matSuffix fontIcon="search" aria-hidden="true" />
                <input
                  matInput
                  type="search"
                  [value]="filterText()"
                  (input)="onFilter($event)"
                  aria-label="Filtrar por nombre o DNI"
                />
              </mat-form-field>
              <span class="toolbar__count" role="status" aria-live="polite">
                {{ displayed().length }} de {{ persons().length }} personas
              </span>
            </div>
          }

          @if (loading()) {
            <div class="page-loading" aria-busy="true">
              <mat-progress-spinner diameter="48" mode="indeterminate" aria-label="Cargando" />
            </div>
          } @else if (loadError()) {
            <app-empty-state
              variant="error"
              icon="error_outline"
              title="No se pudo cargar el listado"
              [description]="loadError()!"
            >
              <button mat-stroked-button type="button" (click)="refreshList()">Reintentar</button>
            </app-empty-state>
          } @else if (persons().length === 0) {
            <app-empty-state
              icon="groups"
              title="Sin personas registradas"
              description="No hay personas disponibles para este módulo."
            />
          } @else if (displayed().length === 0) {
            <app-empty-state
              icon="search_off"
              title="Sin coincidencias"
              [description]="
                'No se encontraron personas para: ' + filterText() + '. Revise el texto e intente de nuevo.'
              "
            />
          } @else {
            <div class="sisrh-table-scroll">
            <table mat-table [dataSource]="pagedDisplayed()" class="tbl hub-table">
              <ng-container matColumnDef="nombreCompleto">
                <th mat-header-cell *matHeaderCellDef scope="col">Nombre completo</th>
                <td mat-cell *matCellDef="let row" class="hub-nombre">{{ row.nombreCompleto }}</td>
              </ng-container>
              <ng-container matColumnDef="dni">
                <th mat-header-cell *matHeaderCellDef scope="col" class="hub-col-dni">DNI</th>
                <td mat-cell *matCellDef="let row" class="hub-col-dni sisrh-tabular">
                  {{ (row.dni ?? '').trim() || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="codigoInterno">
                <th mat-header-cell *matHeaderCellDef scope="col">Código interno</th>
                <td mat-cell *matCellDef="let row">{{ row.codigoInterno ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="regimen">
                <th mat-header-cell *matHeaderCellDef scope="col">Régimen</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.regimenLaboral) {
                    <span class="regimen-badge">{{ row.regimenLaboral }}</span>
                  } @else {
                    —
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <!-- Requiere empleadoId en el listado RRHH (PersonaEmpleadoResponseDto); sin él el enlace queda deshabilitado. -->
                  <a
                    mat-icon-button
                    [routerLink]="['/empleados', hub().segment, 'personas', row.id]"
                    [disabled]="!(row.empleadoId != null && row.empleadoId > 0)"
                    [matTooltip]="
                      !(row.empleadoId != null && row.empleadoId > 0)
                        ? 'No hay vínculo de empleado para esta persona.'
                        : 'Ver y editar datos del empleado'
                    "
                    [attr.aria-label]="'Ver y editar datos de ' + row.nombreCompleto"
                  >
                    <mat-icon fontIcon="manage_accounts" aria-hidden="true" />
                  </a>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns()"></tr>
            </table>
            </div>
            <div class="pager-wrap">
              <mat-paginator
                [length]="displayed().length"
                [pageIndex]="pageIndex()"
                [pageSize]="pageSize()"
                [pageSizeOptions]="pageSizeOptions"
                (page)="onPage($event)"
                showFirstLastButtons
                aria-label="Paginador de personas"
              />
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .hub-nombre {
      font-weight: 600;
      color: var(--sisrh-color-primary, #0f172a);
    }
    .regimen-badge {
      display: inline-block;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      background: #e8f0fe;
      color: #1967d2;
    }
    :host ::ng-deep .hub-table .hub-col-dni {
      white-space: nowrap;
    }
    .pager-wrap {
      margin-top: 0;
      padding: var(--sisrh-spacing-sm, 0.4375rem) var(--sisrh-spacing-md, 0.875rem);
      background: var(--sisrh-color-background, #f8fafc);
      border: 1px solid var(--sisrh-border, #e2e8f0);
      border-top: none;
      border-radius: 0 0 var(--sisrh-radius-md, 8px) var(--sisrh-radius-md, 8px);
    }
    :host ::ng-deep .pager-wrap .mat-mdc-paginator {
      background: transparent;
    }
  `,
})
export class EmpleadoSeleccionHubComponent {
  private readonly api = inject(PersonaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly errors = inject(ErrorMessageService);

  readonly pageSizeOptions = [10, 20, 50] as const;

  /** Columnas mostradas; "régimen" solo si la ruta lo habilita (opt-in). */
  readonly displayedColumns = computed<readonly string[]>(() => {
    const cols = ['nombreCompleto', 'dni', 'codigoInterno'];
    if (this.hub().showRegimen) cols.push('regimen');
    cols.push('acciones');
    return cols;
  });

  readonly hub = toSignal(
    this.route.data.pipe(map((d) => d['empleadosHub'] as empleadosHubRouteData)),
    {
      initialValue: {
        title: 'Selección',
        subtitle: '',
        segment: 'personas',
      } as empleadosHubRouteData,
    },
  );

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly persons = signal<readonly PersonaEmpleado[]>([]);
  readonly filterText = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly displayed = computed(() => {
    const q = this.filterText().trim().toLowerCase();
    const rows = [...this.persons()];
    rows.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es-PE'));
    if (!q) return rows;
    return rows.filter((p) => {
      const blob = `${p.nombreCompleto} ${p.dni} ${p.codigoInterno ?? ''} ${p.regimenLaboral ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  });

  readonly pagedDisplayed = computed(() => {
    const list = this.displayed();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.refreshList();
  }

  onFilter(ev: Event): void {
    this.filterText.set((ev.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  refreshList(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listar().subscribe({
      next: (list) => {
        this.persons.set(list);
        this.clampPageIndex(list.length);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => this.onLoadFail(err),
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  private onLoadFail(err: HttpErrorResponse): void {
    this.loading.set(false);
    this.persons.set([]);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.loadError.set(msg);
  }
}
