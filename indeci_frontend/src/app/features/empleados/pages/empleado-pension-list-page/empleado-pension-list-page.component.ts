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
import { EmpleadoPensionApiService } from '../../services/empleado-pension-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { EmpleadoPensionRow } from '../../models/empleado-pension.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

@Component({
  selector: 'app-empleado-pension-list-page',
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
  templateUrl: './empleado-pension-list-page.component.html',
  styleUrl: './empleado-pension-list-page.component.css',
})
export class EmpleadoPensionListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly pensionApi = inject(EmpleadoPensionApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['tipoRegimen', 'regimen', 'cuspp', 'comision', 'aporte', 'acciones'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly personaId = signal(0);
  readonly empleadoId = signal<number | null>(null);
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly rows = signal<readonly EmpleadoPensionRow[]>([]);

  readonly pageLoading = signal(true);
  readonly tableLoading = signal(false);
  readonly tableLoadError = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly canRegistrar = computed(() => this.empleadoId() != null && this.rows().length === 0);

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('personaId');
    const pid = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/pension']);
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

  fmtPct(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value}%`;
  }

  confirmEliminar(row: EmpleadoPensionRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar pensión',
        message: `Se desactivará el registro de pensión (${row.regimenPensionario || row.tipoRegimen}). ¿Continuar?`,
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
    this.pensionApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Pensión desactivada correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  reloadTable(): void {
    const eid = this.empleadoId();
    if (eid != null) this.loadList(eid);
  }

  private loadList(eid: number): void {
    this.tableLoading.set(true);
    this.tableLoadError.set(null);
    this.pensionApi.listar(eid).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.clampPageIndex(list.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.rows.set([]);
        this.tableLoadError.set(this.translateHttpError(err));
      },
    });
  }

  private translateHttpError(err: HttpErrorResponse): string {
    const body = err.error;
    return isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
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
    void this.router.navigate(['/empleados/pension']);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
