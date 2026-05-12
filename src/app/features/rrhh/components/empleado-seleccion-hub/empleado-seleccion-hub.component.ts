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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/** Route `data` for hub pages (cuentas bancarias, pensión, planilla, puesto). */
export interface RrhhHubRouteData {
  readonly title: string;
  readonly subtitle: string;
  /** URL segment after `/rrhh/`, ej. `cuentas-bancarias` */
  readonly segment: string;
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ hub().title }}</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>{{ hub().title }}</mat-card-title>
          <mat-card-subtitle>{{ hub().subtitle }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="toolbar">
            <mat-form-field appearance="outline" class="filter">
              <mat-label>Buscar</mat-label>
              <input
                matInput
                type="search"
                [value]="filterText()"
                (input)="onFilter($event)"
                aria-label="Filtrar por nombre o DNI"
              />
              <mat-hint>Filtro y paginación en el equipo; el servidor devuelve el listado completo.</mat-hint>
            </mat-form-field>
          </div>

          @if (loading()) {
            <div class="loading" aria-busy="true">
              <mat-progress-spinner diameter="48" mode="indeterminate" aria-label="Cargando" />
            </div>
          } @else {
            <div class="sisrh-table-scroll">
            <table mat-table [dataSource]="pagedDisplayed()" class="tbl">
              <ng-container matColumnDef="nombreCompleto">
                <th mat-header-cell *matHeaderCellDef scope="col">Nombre completo</th>
                <td mat-cell *matCellDef="let row">{{ row.nombreCompleto }}</td>
              </ng-container>
              <ng-container matColumnDef="dni">
                <th mat-header-cell *matHeaderCellDef scope="col">DNI</th>
                <td mat-cell *matCellDef="let row">{{ maskDni(row.dni ?? '') }}</td>
              </ng-container>
              <ng-container matColumnDef="codigoInterno">
                <th mat-header-cell *matHeaderCellDef scope="col">Código interno</th>
                <td mat-cell *matCellDef="let row">{{ row.codigoInterno ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <a
                    mat-icon-button
                    [routerLink]="['/rrhh', hub().segment, 'personas', row.id]"
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
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
            </div>
            <mat-paginator
              [length]="displayed().length"
              [pageIndex]="pageIndex()"
              [pageSize]="pageSize()"
              [pageSizeOptions]="pageSizeOptions"
              (page)="onPage($event)"
              showFirstLastButtons
              aria-label="Paginador de personas"
            />
            @if (displayed().length === 0) {
              <p class="empty" role="status">No hay registros que coincidan con tu búsqueda.</p>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 1rem;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .page-card.sisrh-elevated {
      box-shadow:
        0 1px 2px rgb(15 23 42 / 6%),
        0 6px 20px rgb(15 23 42 / 8%);
      border-radius: 12px;
    }
    .crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
    }
    .crumbs__sep {
      color: #94a3b8;
      user-select: none;
    }
    .crumbs__here {
      color: #475569;
      font-weight: 600;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .filter {
      flex: 1 1 260px;
      min-width: 200px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .tbl {
      width: 100%;
    }
    .empty {
      margin-top: 1rem;
      color: #64748b;
    }
  `,
})
export class EmpleadoSeleccionHubComponent {
  private readonly api = inject(PersonaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['nombreCompleto', 'dni', 'codigoInterno', 'acciones'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly hub = toSignal(
    this.route.data.pipe(map((d) => d['rrhhHub'] as RrhhHubRouteData)),
    {
      initialValue: {
        title: 'Selección',
        subtitle: '',
        segment: 'personas',
      },
    },
  );

  readonly loading = signal(true);
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

  maskDni(value: string): string {
    const t = value.trim();
    if (t.length <= 4) return '••••';
    return `${'•'.repeat(Math.max(0, t.length - 4))}${t.slice(-4)}`;
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
    this.api.listar().subscribe({
      next: (list) => {
        this.persons.set(list);
        this.clampPageIndex(list.length);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => this.onHttpFail(err),
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  private onHttpFail(err: HttpErrorResponse): void {
    this.loading.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
