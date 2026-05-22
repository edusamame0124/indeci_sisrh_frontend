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
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import type { ConfirmDialogSeverity } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../services/movimiento-planilla-api.service';
import { ConciliacionAirhspApiService } from '../../services/conciliacion-airhsp-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { PeriodoEstadoBadgeComponent } from '../../components/periodo-estado-badge/periodo-estado-badge.component';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';
import type { ConciliacionAirhspRow } from '../../models/conciliacion-airhsp.model';

/**
 * Ciclo de vida del período de planilla (Spec 011 — B7).
 *
 * Flujo: ABIERTO → EN_REVISION → APROBADO → CERRADO.
 * - Acción contextual según el estado actual.
 * - Al aprobar exige los 3 gates (LEY-05): certificación presupuestal,
 *   sin conciliación AIRHSP en ROJO y sin movimientos en NETO_NO_VA.
 */
@Component({
  selector: 'app-cierre-periodo-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDialogModule,
    PeriodoEstadoBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cierre-periodo-page.component.html',
  styleUrl: './cierre-periodo-page.component.css',
})
export class CierrePeriodoPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly conciliacionApi = inject(ConciliacionAirhspApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnsPendientes = ['empleadoId', 'totalIngresos', 'totalDescuentos', 'netoPagar', 'estado'] as const;

  readonly periodoId = signal(0);
  readonly periodo = signal<PeriodoPlanillaRow | null>(null);
  readonly movimientos = signal<readonly MovimientoPlanillaRow[]>([]);
  readonly conciliaciones = signal<readonly ConciliacionAirhspRow[]>([]);
  readonly nroCertPresup = signal('');
  readonly loading = signal(true);
  readonly operando = signal(false);

  readonly pendientes = computed(() =>
    this.movimientos().filter((m) => m.estado === 'PENDIENTE'),
  );

  readonly totalEmpleados = computed(() => this.movimientos().length);
  readonly totalIngresos = computed(() =>
    this.movimientos().reduce((acc, m) => acc + (m.totalIngresos ?? 0), 0),
  );
  readonly totalDescuentos = computed(() =>
    this.movimientos().reduce((acc, m) => acc + (m.totalDescuentos ?? 0), 0),
  );
  readonly totalNeto = computed(() =>
    this.movimientos().reduce((acc, m) => acc + (m.netoPagar ?? 0), 0),
  );

  /** Movimientos con neto observado (REGLA SERVIR-07). */
  readonly netoNoVa = computed(() =>
    this.movimientos().filter((m) => m.estadoNeto === 'NETO_NO_VA').length,
  );

  /** Conciliaciones AIRHSP sin resolver (PENDIENTE / RECHAZADO). */
  readonly conciliacionesRojas = computed(() =>
    this.conciliaciones().filter(
      (c) => c.estado === 'PENDIENTE' || c.estado === 'RECHAZADO',
    ).length,
  );

  /** Estado de los 3 gates de aprobación (LEY-05). */
  readonly gates = computed(() => {
    const cert = this.nroCertPresup().trim().length > 0;
    const conciliacion = this.conciliacionesRojas() === 0;
    const neto = this.netoNoVa() === 0;
    return { cert, conciliacion, neto, todosOk: cert && conciliacion && neto };
  });

  /** Habilita el botón "Aprobar": en EN_REVISION, gates OK y no operando. */
  readonly canAprobar = computed(
    () =>
      !this.operando() &&
      this.periodo()?.estado === 'EN_REVISION' &&
      this.gates().todosOk,
  );

  fmtMonto(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    const idRaw = this.route.snapshot.paramMap.get('id');
    const id = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      void this.router.navigate(['/planilla/periodos']);
      return;
    }
    this.periodoId.set(id);
    this.cargar(id);
  }

  // ============ Transiciones del ciclo de vida ============

  enviarRevision(): void {
    const p = this.periodo();
    if (p === null || this.operando()) return;
    this.confirmar(
      `Enviar ${p.periodo} a revisión`,
      `El período ${p.periodo} pasará a EN REVISIÓN. Podrás devolverlo a ABIERTO si necesitas corregir.`,
      'Enviar a revisión',
      () => this.ejecutar(this.periodoApi.enviarRevision(p.id), 'Período enviado a revisión.'),
      'info',
    );
  }

  aprobar(): void {
    const p = this.periodo();
    if (p === null || !this.canAprobar()) return;
    this.confirmar(
      `Aprobar ${p.periodo}`,
      `El período ${p.periodo} pasará a APROBADO con la certificación presupuestal ${this.nroCertPresup().trim()}. Quedará listo para cerrarse.`,
      'Aprobar',
      () =>
        this.ejecutar(
          this.periodoApi.aprobar(p.id, { nroCertPresup: this.nroCertPresup().trim() }),
          'Período aprobado.',
        ),
    );
  }

  cerrar(): void {
    const p = this.periodo();
    if (p === null || this.operando()) return;
    this.confirmar(
      `Cerrar ${p.periodo}`,
      `Se cerrará el período ${p.periodo} con ${this.totalEmpleados()} planilla(s) y un neto total de S/ ${this.fmtMonto(this.totalNeto())}.`,
      'Cerrar período',
      () => this.ejecutar(this.periodoApi.cerrar(p.id), 'Período cerrado.'),
    );
  }

  retroceder(): void {
    const p = this.periodo();
    if (p === null || this.operando()) return;
    this.confirmar(
      `Retroceder ${p.periodo}`,
      `El período ${p.periodo} retrocederá un paso en el flujo de aprobación.`,
      'Retroceder',
      () => this.ejecutar(this.periodoApi.reabrir(p.id), 'Período retrocedido un paso.'),
    );
  }

  private confirmar(
    title: string,
    message: string,
    confirmLabel: string,
    accion: () => void,
    severity: ConfirmDialogSeverity = 'warning',
  ): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title,
        message,
        confirmLabel,
        cancelLabel: 'Cancelar',
        severity,
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) accion();
    });
  }

  private ejecutar(obs: ReturnType<PeriodoPlanillaApiService['cerrar']>, exito: string): void {
    this.operando.set(true);
    obs.subscribe({
      next: () => {
        this.operando.set(false);
        this.snack.open(exito, 'Cerrar', { duration: 4000 });
        this.cargar(this.periodoId());
      },
      error: (err: HttpErrorResponse) => {
        this.operando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Carga ============

  private cargar(id: number): void {
    this.loading.set(true);
    // No existe GET-by-id en el backend: filtramos `listar()`.
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const found = rows.find((r) => r.id === id) ?? null;
        if (found === null) {
          this.snack.open('No encontramos el periodo solicitado.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/planilla/periodos']);
          return;
        }
        this.periodo.set(found);
        this.nroCertPresup.set(found.nroCertPresup ?? '');
        forkJoin({
          movimientos: this.movimientoApi.listarPeriodo(found.periodo),
          conciliaciones: this.conciliacionApi.listarPorPeriodo(found.id),
        }).subscribe({
          next: ({ movimientos, conciliaciones }) => {
            this.movimientos.set(movimientos);
            this.conciliaciones.set(conciliaciones);
            this.loading.set(false);
          },
          error: (err: HttpErrorResponse) => {
            this.loading.set(false);
            this.movimientos.set([]);
            this.conciliaciones.set([]);
            this.onHttpSnack(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
        void this.router.navigate(['/planilla/periodos']);
      },
    });
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
