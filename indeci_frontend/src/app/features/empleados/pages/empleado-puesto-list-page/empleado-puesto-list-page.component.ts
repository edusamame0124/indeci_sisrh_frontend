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
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EmpleadoPuestoApiService } from '../../services/empleado-puesto-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { EmpleadoPuestoRow } from '../../models/empleado-puesto.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

@Component({
  selector: 'app-empleado-puesto-list-page',
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
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/empleados/puesto">Puesto</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ persona()?.nombreCompleto ?? '…' }}</span>
      </nav>

      <div class="actions">
        <a mat-button routerLink="/empleados/puesto">Volver</a>
        @if (canRegistrarMovimiento()) {
          @if (!tableLoading()) {
          <a
            mat-flat-button
            color="primary"
            [routerLink]="['/empleados/puesto/personas', personaId(), 'nueva']"
            [attr.aria-label]="registrarPuestoBotonEtiqueta()"
          >
            {{ registrarPuestoBotonEtiqueta() }}
          </a>
          } @else {
            <button mat-flat-button color="primary" type="button" disabled [attr.aria-busy]="true">
              Registrar puesto
            </button>
          }
        }
      </div>

      @if (pageLoading()) {
        <div class="loading" aria-busy="true">
          <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando" />
        </div>
      } @else if (!empleadoId()) {
        <mat-card class="page-card sisrh-elevated" role="alert">
          <mat-card-content>
            <p>No hay registro de empleado vinculado a esta persona. No se puede gestionar puesto.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>Puesto e historial</mat-card-title>
            <mat-card-subtitle>
              {{ persona()?.nombreCompleto }} — DNI {{ persona()?.dni }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="hint">
              @if (hasHistorialRows()) {
                Un nuevo registro cierra el puesto vigente y abre el siguiente. Puede editar el puesto
                vigente con el ícono de lápiz.
              } @else if (!tableLoading()) {
                Registra el primer puesto del colaborador.
              }
            </p>

            @if (tableLoading()) {
              <div class="loading" aria-busy="true">
                <mat-progress-spinner mode="indeterminate" diameter="40" aria-label="Cargando datos" />
              </div>
            } @else if (rows().length === 0) {
              <app-empty-state
                icon="badge"
                title="Sin puesto registrado"
                description="Este colaborador no tiene movimientos de puesto en el historial."
              />
            } @else {
              <div class="sisrh-table-scroll">
              <table mat-table [dataSource]="pagedRows()" class="tbl">
                <ng-container matColumnDef="cargo">
                  <th mat-header-cell *matHeaderCellDef scope="col">Cargo</th>
                  <td mat-cell *matCellDef="let row">{{ row.cargo }}</td>
                </ng-container>
                <ng-container matColumnDef="nivel">
                  <th mat-header-cell *matHeaderCellDef scope="col">Nivel</th>
                  <td mat-cell *matCellDef="let row">{{ catalogLabel(row.nivel, row.nivelId) }}</td>
                </ng-container>
                <ng-container matColumnDef="sede">
                  <th mat-header-cell *matHeaderCellDef scope="col">Sede</th>
                  <td mat-cell *matCellDef="let row">{{ catalogLabel(row.sede, row.sedeId) }}</td>
                </ng-container>
                <ng-container matColumnDef="oficina">
                  <th mat-header-cell *matHeaderCellDef scope="col">Oficina</th>
                  <td mat-cell *matCellDef="let row">{{ catalogLabel(row.oficina, row.oficinaId) }}</td>
                </ng-container>
                <ng-container matColumnDef="activo">
                  <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                  <td mat-cell *matCellDef="let row">{{ row.activo === 1 ? 'Vigente' : 'Cerrado' }}</td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef scope="col">Acciones</th>
                  <td mat-cell *matCellDef="let row">
                    @if (row.activo === 1) {
                      <a
                        mat-icon-button
                        [routerLink]="[
                          '/empleados/puesto/personas',
                          personaId(),
                          'editar',
                          row.id,
                        ]"
                        [attr.aria-label]="'Editar puesto ' + row.cargo"
                        matTooltip="Editar"
                      >
                        <mat-icon fontIcon="edit" aria-hidden="true" />
                      </a>
                      <button
                        mat-icon-button
                        type="button"
                        aria-label="Desactivar puesto"
                        matTooltip="Desactivar"
                        (click)="confirmEliminar(row)"
                      >
                        <mat-icon fontIcon="delete_outline" aria-hidden="true" />
                      </button>
                    }
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
                aria-label="Paginador de puesto e historial"
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
export class EmpleadoPuestoListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly puestoApi = inject(EmpleadoPuestoApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'cargo',
    'nivel',
    'sede',
    'oficina',
    'activo',
    'acciones',
  ] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly personaId = signal(0);
  readonly empleadoId = signal<number | null>(null);
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly rows = signal<readonly EmpleadoPuestoRow[]>([]);

  readonly pageLoading = signal(true);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly canRegistrarMovimiento = computed(() => this.empleadoId() != null);

  /** Lista ya cargada y con al menos un movimiento puesto/laboral. */
  readonly hasHistorialRows = computed(() => !this.tableLoading() && this.rows().length > 0);

  /**
   * Etiqueta del CTA solo cuando la tabla terminó de cargar; mientras tanto un botón deshabilitado muestra texto neutro.
   */
  readonly registrarPuestoBotonEtiqueta = computed(() => {
    if (this.empleadoId() == null) return '';
    if (this.rows().length === 0) return 'Registrar nuevo puesto';
    return 'Registrar cambio de puesto';
  });

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  /** Muestra el nombre del catálogo; si no viene en el API, cae al ID numérico. */
  catalogLabel(nombre: string | null | undefined, id: number | null | undefined): string {
    const label = nombre?.trim();
    if (label) return label;
    if (id != null && id > 0) return String(id);
    return '—';
  }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('personaId');
    const pid = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/puesto']);
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

  confirmEliminar(row: EmpleadoPuestoRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar puesto',
        message: `Se cerrará el registro de puesto "${row.cargo}". ¿Continuar?`,
        confirmLabel: 'Desactivar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private eliminar(id: number): void {
    const eid = this.empleadoId();
    if (eid == null) return;
    this.puestoApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Puesto desactivado correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private loadList(eid: number): void {
    this.tableLoading.set(true);
    this.puestoApi.listar(eid).subscribe({
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
    void this.router.navigate(['/empleados/puesto']);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
