import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { sisrhConfirmDialogConfig, sisrhLargeDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { readApiErrorMessage } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import {
  PersonaFormDialogData,
  PersonaFormDialogResult,
  PersonaFormPageComponent,
} from '../persona-form-page/persona-form-page.component';
import {
  PersonaDetailDialogData,
  PersonaDetailDialogEditIntent,
  PersonaDetailPageComponent,
} from '../persona-detail-page/persona-detail-page.component';

interface PersonaQuickAccess {
  readonly key: 'puesto' | 'cuentaBancaria' | 'pension' | 'planilla' | 'conceptos';
  readonly segment: 'puesto' | 'cuentas-bancarias' | 'pension' | 'planilla' | 'conceptos';
  readonly icon: string;
  readonly label: string;
  readonly header: string;
}

export const PERSONA_QUICK_ACCESS: readonly PersonaQuickAccess[] = [
  {
    key: 'puesto',
    segment: 'puesto',
    icon: 'badge',
    label: 'puesto laboral',
    header: 'Puesto',
  },
  {
    key: 'cuentaBancaria',
    segment: 'cuentas-bancarias',
    icon: 'account_balance',
    label: 'cuenta bancaria',
    header: 'Cuenta',
  },
  {
    key: 'pension',
    segment: 'pension',
    icon: 'savings',
    label: 'pensión',
    header: 'Pensión',
  },
  {
    key: 'planilla',
    segment: 'planilla',
    icon: 'receipt_long',
    label: 'planilla',
    header: 'Planilla',
  },
  {
    key: 'conceptos',
    segment: 'conceptos',
    icon: 'list_alt',
    label: 'conceptos asignados',
    header: 'Conceptos',
  },
] as const;

@Component({
  selector: 'app-persona-list-page',
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
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
        <span class="crumbs__here">Personas</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>Personas y empleados</mat-card-title>
          <mat-card-subtitle>Consulta administrativa — RRHH INDECI</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="page-hint" role="status">
            Listado completo desde el servidor; la búsqueda y paginación se aplican en su equipo.
          </p>
          @if (!loading() && !loadError()) {
            <div class="toolbar sisrh-toolbar">
              <mat-form-field appearance="outline" class="toolbar__search" subscriptSizing="dynamic">
                <mat-label>Buscar</mat-label>
                <mat-icon matPrefix fontIcon="search" aria-hidden="true" />
                <input
                  matInput
                  [value]="filterText()"
                  (input)="onFilter($event)"
                  type="search"
                  autocomplete="off"
                  aria-label="Filtrar por nombre, DNI o código interno"
                />
              </mat-form-field>
              <span class="toolbar__count" role="status" aria-live="polite">
                {{ displayed().length }} de {{ persons().length }} personas
              </span>
              <button
                mat-flat-button
                color="primary"
                type="button"
                class="toolbar__action"
                (click)="openCreatePersona()"
              >
                <mat-icon fontIcon="person_add" aria-hidden="true" />
                Nueva persona
              </button>
            </div>
          }

          @if (loading()) {
            <div class="page-loading" aria-busy="true">
              <mat-progress-spinner
                mode="indeterminate"
                diameter="48"
                aria-label="Cargando personas"
              />
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
              description="Aún no hay personas en el sistema. Registre la primera para comenzar."
            >
              <button mat-flat-button color="primary" type="button" (click)="openCreatePersona()">
                <mat-icon fontIcon="person_add" aria-hidden="true" />
                Nueva persona
              </button>
            </app-empty-state>
          } @else if (displayed().length === 0) {
            <app-empty-state
              icon="search_off"
              title="Sin coincidencias"
              [description]="
                'No se encontraron personas para: ' + filterText() + '. Revise el texto e intente de nuevo.'
              "
            />
          } @else {
            <div class="sisrh-table-scroll persona-table-wrap">
            <table mat-table class="tbl persona-table" [dataSource]="pagedDisplayed()">
              <ng-container matColumnDef="nombreCompleto">
                <th mat-header-cell *matHeaderCellDef scope="col">Nombre completo</th>
                <td mat-cell *matCellDef="let row" class="persona-nombre">{{ row.nombreCompleto }}</td>
              </ng-container>
              <ng-container matColumnDef="dni">
                <th mat-header-cell *matHeaderCellDef scope="col" class="col-dni">DNI</th>
                <td mat-cell *matCellDef="let row" class="col-dni sisrh-tabular">
                  {{ (row.dni ?? '').trim() || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="codigoInterno">
                <th mat-header-cell *matHeaderCellDef scope="col">Código interno</th>
                <td mat-cell *matCellDef="let row">{{ row.codigoInterno ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.estado) {
                    <span
                      class="sisrh-badge"
                      [class.sisrh-badge--success]="!isInactive(row)"
                      [class.sisrh-badge--neutral]="isInactive(row)"
                      >{{ row.estado }}</span
                    >
                  } @else {
                    —
                  }
                </td>
              </ng-container>
              @for (qa of quickAccess; track qa.key) {
                <ng-container [matColumnDef]="qa.key">
                  <th mat-header-cell *matHeaderCellDef scope="col" class="col-quick">
                    {{ qa.header }}
                  </th>
                  <td
                    mat-cell
                    *matCellDef="let row"
                    class="col-quick"
                    [attr.data-inactive]="isInactive(row) ? 'true' : null"
                  >
                    <a
                      mat-icon-button
                      class="row-action row-action--quick"
                      [routerLink]="['/empleados', qa.segment, 'personas', row.id]"
                      [attr.aria-label]="'Ir a ' + qa.label + ' de ' + row.nombreCompleto"
                      [matTooltip]="
                        isInactive(row)
                          ? 'Consulta de ' + qa.label + ' (inactivo)'
                          : 'Ir a ' + qa.label
                      "
                    >
                      <mat-icon [fontIcon]="qa.icon" aria-hidden="true" />
                    </a>
                  </td>
                </ng-container>
              }
              <ng-container matColumnDef="accesos">
                <th mat-header-cell *matHeaderCellDef scope="col" class="col-accesos">
                  Accesos
                </th>
                <td
                  mat-cell
                  *matCellDef="let row"
                  class="col-accesos"
                  [attr.data-inactive]="isInactive(row) ? 'true' : null"
                >
                  <div class="accesos-cluster">
                    @for (qa of quickAccess; track qa.key) {
                      <a
                        mat-icon-button
                        class="row-action row-action--quick"
                        [routerLink]="['/empleados', qa.segment, 'personas', row.id]"
                        [attr.aria-label]="'Ir a ' + qa.label + ' de ' + row.nombreCompleto"
                        [matTooltip]="
                          isInactive(row)
                            ? 'Consulta de ' + qa.label + ' (inactivo)'
                            : 'Ir a ' + qa.label
                        "
                      >
                        <mat-icon [fontIcon]="qa.icon" aria-hidden="true" />
                      </a>
                    }
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef scope="col" class="col-acciones">
                  Acciones
                </th>
                <td mat-cell *matCellDef="let row" class="col-acciones">
                  <button
                    mat-icon-button
                    type="button"
                    class="row-action row-action--view"
                    (click)="openDetail(row)"
                    [attr.aria-label]="'Ver ficha de ' + row.nombreCompleto"
                    matTooltip="Ver ficha"
                  >
                    <mat-icon fontIcon="visibility" aria-hidden="true" />
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    class="row-action row-action--edit"
                    (click)="openEdit(row)"
                    [attr.aria-label]="'Editar ' + row.nombreCompleto"
                    matTooltip="Editar"
                  >
                    <mat-icon fontIcon="edit" aria-hidden="true" />
                  </button>
                  @if (!isInactive(row)) {
                    <button
                      mat-icon-button
                      type="button"
                      class="row-action row-action--warn"
                      [attr.aria-label]="'Inactivar empleado: ' + row.nombreCompleto"
                      matTooltip="Inactivar"
                      (click)="confirmInactivar(row)"
                    >
                      <mat-icon fontIcon="person_off" aria-hidden="true" />
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns()"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns()"
                class="persona-row"
                [attr.data-state]="row.estado"
              ></tr>
            </table>
          </div>
          <div class="paginator-bar">
            <mat-paginator
              class="persona-paginator"
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
  styles: [
    `
      .persona-table-wrap {
        margin-top: 0.25rem;
      }
      @media (min-width: 1024px) {
        .persona-table {
          min-width: 960px;
        }
      }
      .persona-nombre {
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
      }
      :host ::ng-deep .persona-table .col-dni {
        white-space: nowrap;
      }
      :host ::ng-deep .persona-table .col-acciones {
        width: 1%;
        white-space: nowrap;
        text-align: right;
      }
      :host ::ng-deep .persona-table .col-quick {
        width: 1%;
        white-space: nowrap;
        text-align: center;
        padding: 0 4px;
      }
      :host ::ng-deep .persona-table .col-accesos {
        width: 1%;
        white-space: nowrap;
        text-align: center;
      }
      .accesos-cluster {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
      }
      :host ::ng-deep .accesos-cluster .mat-mdc-icon-button {
        width: 32px;
        height: 32px;
        padding: 0;
      }
      :host ::ng-deep .persona-table td[data-inactive='true'] .row-action--quick {
        opacity: 0.55;
      }
      .row-action--quick {
        color: var(--sisrh-color-cta, #0369a1);
      }
      .row-action:focus-visible {
        outline: 3px solid var(--sisrh-color-cta, #0369a1);
        outline-offset: 2px;
        border-radius: 50%;
      }
      .paginator-bar {
        margin-top: 0;
        padding: var(--sisrh-spacing-sm, 0.5rem) var(--sisrh-spacing-md, 1rem);
        background: var(--sisrh-color-background, #f8fafc);
        border: 1px solid var(--sisrh-border, #e2e8f0);
        border-top: none;
        border-radius: 0 0 var(--sisrh-radius-md, 8px) var(--sisrh-radius-md, 8px);
      }
      :host ::ng-deep .persona-paginator.mat-mdc-paginator {
        background: transparent;
      }
    `,
  ],
})
export class PersonaListPageComponent {
  private readonly api = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialogs = inject(MatDialog);
  private readonly errors = inject(ErrorMessageService);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly quickAccess = PERSONA_QUICK_ACCESS;

  readonly compactMode = toSignal(
    this.breakpoint.observe('(max-width: 1023.98px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly columns = computed<readonly string[]>(() =>
    this.compactMode()
      ? ['nombreCompleto', 'dni', 'estado', 'accesos', 'acciones']
      : [
          'nombreCompleto',
          'dni',
          'codigoInterno',
          'estado',
          ...PERSONA_QUICK_ACCESS.map((qa) => qa.key),
          'acciones',
        ],
  );

  readonly pageSizeOptions = [10, 20, 50] as const;
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
      const blob = `${p.nombreCompleto} ${p.dni} ${p.codigoInterno ?? ''}`.toLowerCase();
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

  isInactive(row: Pick<PersonaEmpleado, 'estado'>): boolean {
    return (row.estado ?? '').toUpperCase() === 'INACTIVO';
  }

  onFilter(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.filterText.set(v);
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  openCreatePersona(): void {
    const ref = this.dialogs.open<
      PersonaFormPageComponent,
      PersonaFormDialogData | undefined,
      PersonaFormDialogResult | undefined
    >(PersonaFormPageComponent, sisrhLargeDialogConfig({ data: { mode: 'create' } }));
    ref.afterClosed().subscribe((result) => {
      if (result?.saved) this.refreshList();
    });
  }

  openEdit(row: Pick<PersonaEmpleado, 'id'>): void {
    const ref = this.dialogs.open<
      PersonaFormPageComponent,
      PersonaFormDialogData | undefined,
      PersonaFormDialogResult | undefined
    >(
      PersonaFormPageComponent,
      sisrhLargeDialogConfig({ data: { mode: 'edit', editId: row.id } }),
    );
    ref.afterClosed().subscribe((result) => {
      if (result?.saved) this.refreshList();
    });
  }

  openDetail(row: PersonaEmpleado): void {
    const ref = this.dialogs.open<
      PersonaDetailPageComponent,
      PersonaDetailDialogData | undefined,
      PersonaDetailDialogEditIntent | undefined
    >(
      PersonaDetailPageComponent,
      sisrhLargeDialogConfig({
        width: 'min(640px, 96vw)',
        data: { personaId: row.id },
      }),
    );
    ref.afterClosed().subscribe((result) => {
      if (result?.action === 'edit') this.openEdit({ id: result.personaId });
    });
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

  confirmInactivar(row: PersonaEmpleado): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Inactivar persona',
        message: `Se marcará como INACTIVO el empleado asociado a ${row.nombreCompleto}. ¿Continuar?`,
        confirmLabel: 'Inactivar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((accepted: boolean | undefined) => {
      if (accepted === true) this.inactivar(row.id);
    });
  }

  private inactivar(id: number): void {
    this.api.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Estado actualizado correctamente.', 'Cerrar', { duration: 4000 });
        this.refreshList();
      },
      error: (err: HttpErrorResponse) => this.onActionFail(err),
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
    this.loadError.set(this.translateHttpError(err));
  }

  private onActionFail(err: HttpErrorResponse): void {
    this.snack.open(this.translateHttpError(err), 'Cerrar', { duration: 7000 });
  }

  private translateHttpError(err: HttpErrorResponse): string {
    return this.errors.translate(readApiErrorMessage(err.error));
  }
}
