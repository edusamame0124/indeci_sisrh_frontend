import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PersonaApiService } from '../../../../../empleados/services/persona-api.service';
import { PersonaFormPageComponent, type PersonaFormDialogResult } from '../../../../../empleados/pages/persona-form-page/persona-form-page.component';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import type { PersonaResumen } from '../../../../../empleados/models/persona-empleado.model';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-admin-persona-crud-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="persona-dlg-header">
      <div class="persona-dlg-header__main">
        <span class="persona-dlg-header__icon" aria-hidden="true">
          <mat-icon>group</mat-icon>
        </span>
        <div class="persona-dlg-header__text">
          <h2 mat-dialog-title class="persona-dlg-header__title" tabindex="-1">
            Buscar Persona
          </h2>
          <p class="persona-dlg-header__subtitle">Base de datos institucional de personas</p>
        </div>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Cerrar" class="persona-dlg-header__close">
        <mat-icon>close</mat-icon>
      </button>
    </header>

    <div class="dialog-body">
      <div class="toolbar sisrh-toolbar" style="margin-bottom: 1rem;">
        <mat-form-field appearance="outline" class="toolbar__search" style="flex: 1;">
          <mat-label>Buscar por DNI o Nombre</mat-label>
          <input
            matInput
            type="search"
            [value]="filterQ()"
            (input)="onQ($event)"
            aria-label="Filtro de búsqueda"
          />
          <mat-icon matSuffix fontIcon="search" aria-hidden="true" />
        </mat-form-field>
        <div class="toolbar__actions">
          <button mat-flat-button color="primary" type="button" (click)="openForm()">
            <mat-icon fontIcon="person_add" aria-hidden="true" />
            Nueva Persona
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="page-loading" aria-busy="true" style="padding: 3rem 0; display: flex; justify-content: center;">
          <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando" />
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
          icon="search_off"
          title="Sin resultados"
          description="No se encontraron personas con el filtro actual."
        />
      } @else {
        <div class="sisrh-table-scroll" style="max-height: 400px; overflow: auto; border: 1px solid var(--sisrh-color-border, #e2e8f0); border-radius: 8px;">
          <table mat-table class="tbl" [dataSource]="rows()">
            <ng-container matColumnDef="dni">
              <th mat-header-cell *matHeaderCellDef scope="col">N° DNI</th>
              <td mat-cell *matCellDef="let row">{{ row.dni }}</td>
            </ng-container>
            <ng-container matColumnDef="nombreCompleto">
              <th mat-header-cell *matHeaderCellDef scope="col">Nombre completo</th>
              <td mat-cell *matCellDef="let row">{{ row.nombreCompleto }}</td>
            </ng-container>
            <ng-container matColumnDef="estadoCivil">
              <th mat-header-cell *matHeaderCellDef scope="col">Estado Civil</th>
              <td mat-cell *matCellDef="let row">{{ row.estadoCivil || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="ruc">
              <th mat-header-cell *matHeaderCellDef scope="col">RUC</th>
              <td mat-cell *matCellDef="let row">{{ row.ruc || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="profesion">
              <th mat-header-cell *matHeaderCellDef scope="col">Profesión</th>
              <td mat-cell *matCellDef="let row">{{ row.profesion || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="gradoAcademico">
              <th mat-header-cell *matHeaderCellDef scope="col">Grado Académico</th>
              <td mat-cell *matCellDef="let row">{{ row.gradoAcademico || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button
                  mat-icon-button
                  color="primary"
                  type="button"
                  (click)="openForm(row.id)"
                  matTooltip="Editar persona"
                  aria-label="Editar"
                >
                  <mat-icon fontIcon="edit" />
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  type="button"
                  (click)="confirmDelete(row)"
                  matTooltip="Eliminar persona"
                  aria-label="Eliminar"
                >
                  <mat-icon fontIcon="delete" />
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="total()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[5]"
          (page)="onPage($event)"
          showFirstLastButtons
          aria-label="Paginador"
          style="margin-top: 1rem;"
        />
      }
    </div>
  `,
  styles: [
    `
      .persona-dlg-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
        padding: 18px 20px 14px;
        background: linear-gradient(180deg, #f1f5f9 0%, #fff 72%);
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
      }
      .persona-dlg-header__main {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        min-width: 0;
        flex: 1;
      }
      .persona-dlg-header__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--sisrh-color-cta, #0369a1) 14%, #fff);
        color: var(--sisrh-color-cta, #0369a1);
      }
      .persona-dlg-header__icon mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .persona-dlg-header__text {
        min-width: 0;
      }
      .persona-dlg-header__title {
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.3;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.02em;
      }
      .persona-dlg-header__subtitle {
        margin: 4px 0 0;
        font-size: 0.8125rem;
        line-height: 1.45;
        color: var(--sisrh-color-muted, #64748b);
      }
      .persona-dlg-header__close {
        flex-shrink: 0;
        margin: -6px -8px 0 0;
        color: var(--sisrh-color-muted, #64748b);
      }
      .dialog-body {
        padding: 20px;
        min-height: 500px;
        display: flex;
        flex-direction: column;
      }
      .toolbar {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class AdminPersonaCrudDialogComponent implements OnInit {
  private readonly api = inject(PersonaApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly columns = [
    'dni',
    'nombreCompleto',
    'estadoCivil',
    'ruc',
    'profesion',
    'gradoAcademico',
    'acciones',
  ] as const;

  readonly rows = signal<readonly PersonaResumen[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  
  readonly pageIndex = signal(0);
  readonly pageSize = signal(5);
  readonly filterQ = signal('');

  ngOnInit(): void {
    this.reload();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.reload();
  }

  private reloadTimeout: ReturnType<typeof setTimeout> | null = null;
  onQ(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.filterQ.set(v);
    this.pageIndex.set(0);
    
    if (this.reloadTimeout) clearTimeout(this.reloadTimeout);
    this.reloadTimeout = setTimeout(() => this.reload(), 350);
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listarPaginado(this.pageIndex(), this.pageSize(), this.filterQ().trim())
      .subscribe({
        next: (page) => {
          this.rows.set(page.content);
          this.total.set(page.totalElements);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.rows.set([]);
          this.total.set(0);
          const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
          this.loadError.set(this.errors.translate(raw));
        }
      });
  }

  openForm(editId?: number): void {
    const dialogRef = this.dialog.open<PersonaFormPageComponent, any, PersonaFormDialogResult>(PersonaFormPageComponent, {
      width: '680px',
      disableClose: true,
      panelClass: 'sisrh-dialog-shell--large',
      data: editId ? { mode: 'edit', editId } : { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((res) => {
      // res exists only if successfully saved, since cancel returns undefined.
      if (res) {
        this.snack.open('Operación exitosa', 'Cerrar', { duration: 4000 });
        this.reload();
      }
    });
  }

  confirmDelete(row: PersonaResumen): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar Persona',
      message: `¿Está seguro de eliminar a ${row.nombreCompleto}? Esta acción lo inactivará.`,
      confirmLabel: 'Eliminar',
      confirmColor: 'warn',
    };
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.loading.set(true);
        this.api.eliminar(row.id).subscribe({
          next: () => {
            this.snack.open('Persona eliminada', 'Cerrar', { duration: 4000 });
            this.reload();
          },
          error: (err: HttpErrorResponse) => {
            this.loading.set(false);
            const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
            this.snack.open(this.errors.translate(raw), 'Cerrar', { duration: 6000 });
          }
        });
      }
    });
  }
}
