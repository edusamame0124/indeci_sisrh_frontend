import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CatalogoApiService } from '../../../rrhh/services/catalogo-api.service';
import type { BankCatalogItem } from '../../../rrhh/models/catalog-item.model';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import {
  CatalogNameFormDialogComponent,
  type CatalogNameFormDialogData,
} from '../../components/catalog-name-form-dialog/catalog-name-form-dialog.component';

@Component({
  selector: 'app-banco-catalog-page',
  standalone: true,
  imports: [
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
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="card">
      <mat-card-header>
        <mat-card-title>Catálogo de bancos</mat-card-title>
        <mat-card-subtitle>Administración — solo lectura hasta habilitar escritura en el servidor</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p class="hint" role="status">
          Los nombres se normalizan en MAYÚSCULAS al guardar. La baja es lógica cuando el backend
          lo implemente (ver especificación 006 — BKD-001).
        </p>
        <div class="toolbar">
          <mat-form-field appearance="outline" class="filter">
            <mat-label>Buscar</mat-label>
            <input
              matInput
              type="search"
              [value]="filterText()"
              (input)="onFilter($event)"
              aria-label="Filtrar bancos por nombre"
            />
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" (click)="openCreate()">
            <mat-icon fontIcon="add" aria-hidden="true" />
            Nuevo banco
          </button>
        </div>

        @if (loading()) {
          <div class="loading" aria-busy="true">
            <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando bancos" />
          </div>
        } @else {
          <div class="sisrh-table-scroll">
            <table mat-table class="tbl" [dataSource]="pagedDisplayed()">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef scope="col">Código</th>
              <td mat-cell *matCellDef="let row">{{ row.id }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef scope="col">Nombre</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button
                  type="button"
                  mat-icon-button
                  (click)="openEdit(row)"
                  [attr.aria-label]="'Editar banco ' + row.name"
                  matTooltip="Editar"
                >
                  <mat-icon fontIcon="edit" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  mat-icon-button
                  (click)="confirmDelete(row)"
                  [attr.aria-label]="'Dar de baja banco ' + row.name"
                  matTooltip="Dar de baja"
                >
                  <mat-icon fontIcon="delete_outline" aria-hidden="true" />
                </button>
              </td>
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
            aria-label="Paginador catálogo de bancos"
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
      .hint {
        font-size: 0.875rem;
        color: #475569;
        margin: 0 0 1rem;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      .filter {
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
    `,
  ],
})
export class BancoCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly cols = ['id', 'name', 'acciones'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly loading = signal(true);
  readonly rows = signal<readonly BankCatalogItem[]>([]);
  readonly filterText = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly displayed = computed(() => {
    const f = this.filterText().trim().toLowerCase();
    const list = this.rows();
    if (!f) return list;
    return list.filter((b) => b.name.toLowerCase().includes(f));
  });

  readonly pagedDisplayed = computed(() => {
    const list = this.displayed();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.reload();
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

  openCreate(): void {
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'BANK_CREATE_OPEN' } });
    const data: CatalogNameFormDialogData = {
      title: 'Nuevo banco',
      nameLabel: 'Nombre del banco',
      initialName: '',
      submitLabel: 'Guardar',
    };
    const ref = this.dialog.open(CatalogNameFormDialogComponent, { data, width: '400px' });
    ref.afterClosed().subscribe((name) => {
      if (!name) return;
      this.api.crearBanco({ name }).subscribe({
        next: () => {
          this.snack.open('Banco registrado correctamente.', 'Cerrar', { duration: 4000 });
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'BANK_CREATE_FAIL'),
      });
    });
  }

  openEdit(row: BankCatalogItem): void {
    this.telemetry.track('CATALOG_ADMIN_UI', {
      extra: { action: 'BANK_EDIT_OPEN', id: row.id },
    });
    const data: CatalogNameFormDialogData = {
      title: 'Editar banco',
      nameLabel: 'Nombre del banco',
      initialName: row.name,
      submitLabel: 'Guardar cambios',
    };
    const ref = this.dialog.open(CatalogNameFormDialogComponent, { data, width: '400px' });
    ref.afterClosed().subscribe((name) => {
      if (!name) return;
      this.api.actualizarBanco(row.id, { name }).subscribe({
        next: () => {
          this.snack.open('Banco actualizado correctamente.', 'Cerrar', { duration: 4000 });
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'BANK_EDIT_FAIL'),
      });
    });
  }

  confirmDelete(row: BankCatalogItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Dar de baja banco',
        message: `¿Confirmas la baja del banco "${row.name}"? Esta acción puede afectar referencias existentes.`,
        confirmLabel: 'Dar de baja',
        cancelLabel: 'Cancelar',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.api.eliminarBanco(row.id).subscribe({
        next: () => {
          this.snack.open('Banco dado de baja correctamente.', 'Cerrar', { duration: 4000 });
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'BANK_DELETE_FAIL'),
      });
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.api.listarBancos().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.snack.open(this.resolveLoadError(e), 'Cerrar', { duration: 6000 });
        this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'BANK_LOAD_FAIL' } });
      },
    });
  }

  private resolveLoadError(err: unknown): string {
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      return this.errors.translate(err.error.mensaje);
    }
    return this.errors.translate(null);
  }

  private handleWriteError(err: unknown, action: string): void {
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action } });
    if (this.isWriteUnavailable(err)) {
      this.snack.open(this.errors.catalogosEscrituraNoDisponible(), 'Cerrar', { duration: 8000 });
      return;
    }
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      this.snack.open(this.errors.translate(err.error.mensaje), 'Cerrar', { duration: 6000 });
      return;
    }
    this.snack.open(this.errors.translate(null), 'Cerrar', { duration: 6000 });
  }

  private isWriteUnavailable(err: unknown): boolean {
    return err instanceof HttpErrorResponse && [404, 405, 501].includes(err.status);
  }
}
