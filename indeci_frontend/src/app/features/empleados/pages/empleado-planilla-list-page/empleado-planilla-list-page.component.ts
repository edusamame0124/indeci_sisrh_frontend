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
import { EmpleadoPlanillaApiService } from '../../services/empleado-planilla-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { EmpleadoPlanillaRow } from '../../models/empleado-planilla.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import { calcIncrementosDsTotal } from '../../utils/calc-incrementos-ds-total';

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
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/empleados/planilla">Planilla</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ persona()?.nombreCompleto ?? '…' }}</span>
      </nav>

      <div class="actions">
        <a mat-button routerLink="/empleados/personas">Volver</a>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!canRegistrar()"
          disabledInteractive
          (click)="registrarPlanilla()"
          [matTooltip]="
            canRegistrar()
              ? 'Registrar la configuración remunerativa del empleado'
              : 'Hay un contrato vigente. Ciérrelo con su cese para registrar uno nuevo.'
          "
        >
          Registrar configuración
        </button>
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
                Solo puede existir un contrato vigente. Al cesar el actual (con su sustento) podrá
                registrar uno nuevo; el contrato cesado permanece en el historial.
              </p>
            }

            @if (tableLoading()) {
              <div class="loading" aria-busy="true">
                <mat-progress-spinner mode="indeterminate" diameter="40" aria-label="Cargando datos" />
              </div>
            } @else if (rows().length === 0) {
              <app-empty-state
                icon="receipt_long"
                title="Sin planilla activa"
                description="Este colaborador no tiene una planilla activa registrada."
              />
            } @else {
              <div class="sisrh-table-scroll">
              <table mat-table [dataSource]="pagedRows()" class="tbl">
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                  <td mat-cell *matCellDef="let row">
                    <span [class]="estadoBadgeClass(row.estadoVinculo)">
                      {{ estadoLabel(row.estadoVinculo) }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="regimen">
                  <th mat-header-cell *matHeaderCellDef scope="col">Régimen</th>
                  <td mat-cell *matCellDef="let row">{{ row.regimenLaboral ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="tipoContrato">
                  <th mat-header-cell *matHeaderCellDef scope="col">Tipo contrato</th>
                  <td mat-cell *matCellDef="let row">{{ row.tipoContrato ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="condicion">
                  <th mat-header-cell *matHeaderCellDef scope="col">Condición</th>
                  <td mat-cell *matCellDef="let row">{{ row.condicionLaboral ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="vigencia">
                  <th mat-header-cell *matHeaderCellDef scope="col">Vigencia</th>
                  <td mat-cell *matCellDef="let row" class="col-vigencia">{{ fmtVigencia(row) }}</td>
                </ng-container>
                <ng-container matColumnDef="codigoAirhsp">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                    scope="col"
                    matTooltip="Código AIRHSP"
                  >
                    Cód. AIRHSP
                  </th>
                  <td mat-cell *matCellDef="let row" class="sisrh-tabular col-airhsp">
                    {{ fmtAirhsp(row.codigoAirhsp) }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="montoContrato">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                    scope="col"
                    matTooltip="Monto contrato base"
                  >
                    Monto contrato base
                  </th>
                  <td mat-cell *matCellDef="let row" class="sisrh-tabular">
                    {{ fmtMoney(row.montoContrato) }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="incrementosDs">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                    scope="col"
                    matTooltip="Incrementos DS (total)"
                  >
                    Inc. DS (total)
                  </th>
                  <td
                    mat-cell
                    *matCellDef="let row"
                    class="sisrh-tabular"
                    [matTooltip]="incrementosDsTooltip"
                  >
                    {{ fmtIncrementosDs(row) }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="remuneracionMensual">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                    scope="col"
                    matTooltip="Remuneración mensual"
                  >
                    Remuneración mensual
                  </th>
                  <td mat-cell *matCellDef="let row" class="sisrh-tabular">
                    {{ fmtMoney(row.sueldoBasico) }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="asigFam">
                  <th mat-header-cell *matHeaderCellDef scope="col">Asignación familiar</th>
                  <td mat-cell *matCellDef="let row">{{ row.tieneAsignacionFamiliar === 1 ? 'Sí' : 'No' }}</td>
                </ng-container>
                <ng-container matColumnDef="numHijos">
                  <th mat-header-cell *matHeaderCellDef scope="col">N° hijos</th>
                  <td mat-cell *matCellDef="let row" class="sisrh-tabular">{{ row.numHijos ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef scope="col" class="col-sticky">Acciones</th>
                  <td mat-cell *matCellDef="let row" class="col-sticky">
                    <a
                      mat-icon-button
                      [routerLink]="['/empleados/planilla/personas', personaId(), 'editar', row.id]"
                      aria-label="Editar configuración remunerativa"
                      matTooltip="Editar configuración remunerativa"
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
    .col-airhsp {
      font-family: var(--sisrh-font-mono, ui-monospace, monospace);
      letter-spacing: 0.02em;
    }
    .col-vigencia {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      color: #475569;
    }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    .badge--success {
      background: var(--sisrh-success-100, #e7f5ee);
      color: var(--sisrh-success, #157347);
    }
    .badge--neutral {
      background: #eef2f7;
      color: #475569;
    }
    .badge--info {
      background: var(--sisrh-info-100, #eaf2fb);
      color: var(--sisrh-info, #2563a6);
    }
    .badge--warning {
      background: var(--sisrh-warning-100, #fff4db);
      color: var(--sisrh-warning, #b7791f);
    }
    .badge--danger {
      background: var(--sisrh-danger-100, #fdecec);
      color: var(--sisrh-danger, #b42318);
    }
  .col-sticky {
    position: sticky;
    right: 0;
    background: #fff;
    z-index: 1;
    box-shadow: -4px 0 8px rgb(15 23 42 / 4%);
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
    'estado',
    'regimen',
    'tipoContrato',
    'condicion',
    'vigencia',
    'codigoAirhsp',
    'montoContrato',
    'incrementosDs',
    'remuneracionMensual',
    'asigFam',
    'numHijos',
    'acciones',
  ] as const;
  readonly incrementosDsTooltip =
    'Suma de incrementos DS de negociación colectiva. Detalle en Editar.';
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

  /**
   * Vínculos secuenciales: se puede registrar uno nuevo salvo que exista un contrato
   * vigente (activo sin cese). Los cesados quedan en el historial y no bloquean.
   */
  readonly canRegistrar = computed(
    () => this.empleadoId() != null && !this.rows().some((r) => r.fechaCese == null),
  );

  private readonly moneyFmt = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  /** Navega al alta de planilla. Solo procede si no hay una planilla activa. */
  registrarPlanilla(): void {
    if (!this.canRegistrar()) return;
    void this.router.navigate(['/empleados/planilla/personas', this.personaId(), 'nueva']);
  }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('personaId');
    const pid = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/planilla']);
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

  fmtAirhsp(value: string | null): string {
    if (value == null || value.trim() === '') return '—';
    return value;
  }

  fmtIncrementosDs(row: EmpleadoPlanillaRow): string {
    const total = calcIncrementosDsTotal(row.sueldoBasico, row.montoContrato);
    if (total == null) return '—';
    return this.moneyFmt.format(total);
  }

  estadoLabel(estado: string | null): string {
    switch (estado) {
      case 'VIGENTE':
        return 'Vigente';
      case 'CESADO':
        return 'Cesado';
      case 'PROGRAMADO':
        return 'Programado';
      case 'VENCIDO_PENDIENTE_DE_REGULARIZACION':
        return 'Vencido';
      case 'ANULADO':
        return 'Anulado';
      default:
        return '—';
    }
  }

  estadoBadgeClass(estado: string | null): string {
    switch (estado) {
      case 'VIGENTE':
        return 'badge badge--success';
      case 'CESADO':
        return 'badge badge--neutral';
      case 'PROGRAMADO':
        return 'badge badge--info';
      case 'VENCIDO_PENDIENTE_DE_REGULARIZACION':
        return 'badge badge--warning';
      case 'ANULADO':
        return 'badge badge--danger';
      default:
        return 'badge badge--neutral';
    }
  }

  private fmtDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }

  fmtVigencia(row: EmpleadoPlanillaRow): string {
    const inicio = this.fmtDate(row.fechaInicioContrato);
    const fin = this.fmtDate(row.fechaCese ?? row.fechaFin);
    if (!inicio && !fin) return '—';
    return `${inicio || '—'} – ${fin || 'vigente'}`;
  }

  confirmEliminar(row: EmpleadoPlanillaRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar planilla',
        message:
          'Se desactivará el registro de planilla y dejará de considerarse vigente. ¿Continuar?',
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
    void this.router.navigate(['/empleados/planilla']);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
