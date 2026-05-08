import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmpleadoPlanillaApiService } from '../../services/empleado-planilla-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { EmpleadoPlanillaRow } from '../../models/empleado-planilla.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

@Component({
  selector: 'app-empleado-planilla-list-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/rrhh/planilla">Planilla</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ persona()?.nombreCompleto ?? '…' }}</span>
      </nav>

      <div class="actions">
        <a mat-button routerLink="/rrhh/planilla">Volver</a>
        @if (canRegistrar()) {
          <a
            mat-flat-button
            color="primary"
            [routerLink]="['/rrhh/planilla/personas', personaId(), 'nueva']"
          >
            Registrar planilla
          </a>
        }
      </div>

      @if (pageLoading()) {
        <div class="loading" aria-busy="true">
          <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando" />
        </div>
      } @else if (!empleadoId()) {
        <mat-card class="page-card sisrh-elevated" role="alert">
          <mat-card-content>
            <p>No hay registro de empleado vinculado a esta persona. No se puede gestionar planilla.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>Planilla</mat-card-title>
            <mat-card-subtitle>
              {{ persona()?.nombreCompleto }} — DNI {{ persona()?.dni }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (rows().length > 0) {
              <p class="hint">
                Solo puede existir una planilla activa. Para ajustar montos usa Editar o desactiva y
                registra una nueva.
              </p>
            }

            @if (tableLoading()) {
              <div class="loading" aria-busy="true">
                <mat-progress-spinner mode="indeterminate" diameter="40" aria-label="Cargando datos" />
              </div>
            } @else if (rows().length === 0) {
              <p class="empty" role="status">No hay planilla activa registrada.</p>
            } @else {
              <div class="sisrh-table-scroll">
              <table mat-table [dataSource]="pagedRows()" class="tbl">
                <ng-container matColumnDef="sueldoBasico">
                  <th mat-header-cell *matHeaderCellDef scope="col">Sueldo básico</th>
                  <td mat-cell *matCellDef="let row">{{ fmtMoney(row.sueldoBasico) }}</td>
                </ng-container>
                <ng-container matColumnDef="movilidad">
                  <th mat-header-cell *matHeaderCellDef scope="col">Movilidad</th>
                  <td mat-cell *matCellDef="let row">{{ fmtMoney(row.movilidad) }}</td>
                </ng-container>
                <ng-container matColumnDef="alimentacion">
                  <th mat-header-cell *matHeaderCellDef scope="col">Alimentación</th>
                  <td mat-cell *matCellDef="let row">{{ fmtMoney(row.alimentacion) }}</td>
                </ng-container>
                <ng-container matColumnDef="asigFam">
                  <th mat-header-cell *matHeaderCellDef scope="col">Asignación familiar</th>
                  <td mat-cell *matCellDef="let row">{{ row.tieneAsignacionFamiliar === 1 ? 'Sí' : 'No' }}</td>
                </ng-container>
                <ng-container matColumnDef="numHijos">
                  <th mat-header-cell *matHeaderCellDef scope="col">N° hijos</th>
                  <td mat-cell *matCellDef="let row">{{ row.numHijos ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
                  <td mat-cell *matCellDef="let row">
                    <a
                      mat-icon-button
                      [routerLink]="['/rrhh/planilla/personas', personaId(), 'editar', row.id]"
                      aria-label="Editar planilla"
                      matTooltip="Editar"
                    >
                      <mat-icon fontIcon="edit" aria-hidden="true" />
                    </a>
                    <button
                      mat-icon-button
                      type="button"
                      aria-label="Desactivar planilla"
                      matTooltip="Desactivar"
                      (click)="confirmEliminar(row)"
                    >
                      <mat-icon fontIcon="delete_outline" aria-hidden="true" />
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns"></tr>
              </table>
              </div>
              <mat-paginator
                [length]="rows().length"
                [pageIndex]="pageIndex()"
                [pageSize]="pageSize()"
                [pageSizeOptions]="pageSizeOptions"
                (page)="onPage($event)"
                showFirstLastButtons
                aria-label="Paginador de planilla"
              />
            }
          </mat-card-content>
        </mat-card>
      }
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
    }
    .crumbs__here {
      font-weight: 600;
      color: #475569;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .hint {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 1rem;
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
    }
  `,
})
export class EmpleadoPlanillaListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly planillaApi = inject(EmpleadoPlanillaApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'sueldoBasico',
    'movilidad',
    'alimentacion',
    'asigFam',
    'numHijos',
    'acciones',
  ] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly personaId = signal(0);
  readonly empleadoId = signal<number | null>(null);
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly rows = signal<readonly EmpleadoPlanillaRow[]>([]);

  readonly pageLoading = signal(true);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly canRegistrar = computed(() => this.empleadoId() != null && this.rows().length === 0);

  private readonly moneyFmt = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('personaId');
    const pid = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/rrhh/planilla']);
      return;
    }
    this.personaId.set(pid);

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.persona.set(p);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : null;
        this.empleadoId.set(eid);
        this.pageLoading.set(false);
        if (eid != null) this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => {
        this.pageLoading.set(false);
        this.onHttpFailNavigate(err);
      },
    });
  }

  fmtMoney(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return this.moneyFmt.format(value);
  }

  confirmEliminar(row: EmpleadoPlanillaRow): void {
    const ref = this.dialogs.open(ConfirmDialogComponent, {
      width: 'min(440px, 92vw)',
      data: {
        title: 'Desactivar planilla',
        message:
          'Se desactivará el registro de planilla y dejará de considerarse vigente. ¿Continuar?',
        confirmLabel: 'Desactivar',
        cancelLabel: 'Cancelar',
      },
    });
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private eliminar(id: number): void {
    const eid = this.empleadoId();
    if (eid == null) return;
    this.planillaApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Planilla desactivada correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private loadList(eid: number): void {
    this.tableLoading.set(true);
    this.planillaApi.listar(eid).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.clampPageIndex(list.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  private onHttpFailNavigate(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    void this.router.navigate(['/rrhh/planilla']);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
