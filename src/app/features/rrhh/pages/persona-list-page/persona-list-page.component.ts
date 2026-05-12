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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="card">
      <mat-card-header>
        <mat-card-title>Personas y empleados</mat-card-title>
        <mat-card-subtitle>Consulta administrativa RRHH INDECI</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="toolbar">
          <mat-form-field appearance="outline" class="filter">
            <mat-label>Buscar</mat-label>
            <input matInput [value]="filterText()" (input)="onFilter($event)" type="search" aria-label="Filtrar por nombre, DNI o código" />
            <mat-hint>Filtro y paginación en el equipo; el servidor devuelve el listado completo.</mat-hint>
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" routerLink="/rrhh/personas/nueva">
            <mat-icon fontIcon="person_add" aria-hidden="true" />
            Nueva persona
          </button>
        </div>

        @if (loading()) {
          <div class="loading" aria-busy="true">
            <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando personas" />
          </div>
        } @else {
          <div class="sisrh-table-scroll">
            <table
              mat-table
              class="tbl"
              [dataSource]="pagedDisplayed()"
            >
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
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
              <td mat-cell *matCellDef="let row">{{ row.estado ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
              <td mat-cell *matCellDef="let row">
                <a
                  mat-icon-button
                  [routerLink]="['/rrhh/personas', row.id]"
                  aria-label="Ver ficha"
                  matTooltip="Ver ficha"
                >
                  <mat-icon fontIcon="visibility" aria-hidden="true" />
                </a>
                <a
                  mat-icon-button
                  [routerLink]="['/rrhh/personas', row.id, 'editar']"
                  aria-label="Editar"
                  matTooltip="Editar"
                >
                  <mat-icon fontIcon="edit" aria-hidden="true" />
                </a>
                @if ((row.estado ?? '').toUpperCase() !== 'INACTIVO') {
                  <button
                    mat-icon-button
                    type="button"
                    aria-label="Inactivar empleado"
                    matTooltip="Inactivar"
                    (click)="confirmInactivar(row)"
                  >
                    <mat-icon fontIcon="person_off" aria-hidden="true" />
                  </button>
                }
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
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 1rem;
        font-family: var(--sisrh-font-sans, sans-serif);
      }
      .card {
        margin: 0 auto;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .filter {
        flex: 1 1 220px;
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
        color: #64748b;
        margin-top: 1rem;
      }
    `,
  ],
})
export class PersonaListPageComponent {
  private readonly api = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialogs = inject(MatDialog);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['nombreCompleto', 'dni', 'codigoInterno', 'estado', 'acciones'];

  readonly pageSizeOptions = [10, 20, 50] as const;
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
    const v = (ev.target as HTMLInputElement).value;
    this.filterText.set(v);
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

  confirmInactivar(row: PersonaEmpleado): void {
    const ref = this.dialogs.open(ConfirmDialogComponent, {
      width: 'min(440px, 92vw)',
      data: {
        title: 'Inactivar persona',
        message: `Se marcará como INACTIVO el empleado asociado a ${row.nombreCompleto}. ¿Continuar?`,
        confirmLabel: 'Inactivar',
        cancelLabel: 'Cancelar',
      },
    });
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
