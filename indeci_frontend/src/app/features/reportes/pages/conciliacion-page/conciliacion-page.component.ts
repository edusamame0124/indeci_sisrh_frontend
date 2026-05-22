import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhFormDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { ConciliacionAirhspApiService } from '../../../planilla/services/conciliacion-airhsp-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { ConciliacionAirhspRow } from '../../../planilla/models/conciliacion-airhsp.model';
import {
  ConciliacionRevisionDialogComponent,
  type ConciliacionRevisionResult,
} from './conciliacion-revision-dialog.component';

/** Color de semáforo de una conciliación. */
export type SemaforoConciliacion = 'verde' | 'amarillo' | 'rojo';

/**
 * PANTALLA-06 — Conciliación AIRHSP (SPEC §12.2, ROL_RRHH + ROL_CONTABILIDAD).
 *
 * - Tabla por empleado: monto sistema vs monto AIRHSP + diferencia y estado.
 * - Filtro "solo con discrepancia".
 * - Botón "Revisar" por fila → diálogo para justificar o rechazar.
 * - Semáforo: diferencia > S/0.01 → ROJO · justificado → AMARILLO · = 0 → VERDE.
 * - Mientras haya conciliaciones en ROJO, la planilla del período no avanza.
 */
@Component({
  selector: 'app-conciliacion-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conciliacion-page.component.html',
  styleUrl: './conciliacion-page.component.css',
})
export class ConciliacionPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly conciliacionApi = inject(ConciliacionAirhspApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'empleado',
    'registroAirhsp',
    'montoSistema',
    'montoAirhsp',
    'diferencia',
    'estado',
    'acciones',
  ] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly nombrePorEmpleado = signal<ReadonlyMap<number, string>>(new Map());
  readonly conciliaciones = signal<readonly ConciliacionAirhspRow[]>([]);
  readonly soloDiscrepancia = signal(false);

  readonly loading = signal(true);
  readonly tableLoading = signal(false);

  readonly periodoActivo = computed(() => {
    const sel = this.periodoSeleccionado();
    if (sel == null) return null;
    return this.periodos().find((p) => p.periodo === sel) ?? null;
  });

  /** Filas tras aplicar el filtro "solo con discrepancia". */
  readonly rowsFiltradas = computed<readonly ConciliacionAirhspRow[]>(() => {
    const list = this.conciliaciones();
    if (!this.soloDiscrepancia()) return list;
    return list.filter((r) => Math.abs(r.diferencia ?? 0) > 0.01);
  });

  /** Conteo del semáforo sobre todo el período. */
  readonly resumen = computed(() => {
    let verde = 0;
    let amarillo = 0;
    let rojo = 0;
    for (const r of this.conciliaciones()) {
      const s = this.semaforoDe(r);
      if (s === 'verde') verde++;
      else if (s === 'amarillo') amarillo++;
      else rojo++;
    }
    return { verde, amarillo, rojo };
  });

  /** True si hay conciliaciones en ROJO — la planilla del período no avanza. */
  readonly bloqueaPlanilla = computed(() => this.resumen().rojo > 0);

  ngOnInit(): void {
    this.cargarBase();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarConciliaciones();
  }

  onFiltroDiscrepancia(soloDiscrepancia: boolean): void {
    this.soloDiscrepancia.set(soloDiscrepancia);
  }

  /**
   * Semáforo de una conciliación (SPEC §12.2 PANTALLA-06):
   * JUSTIFICADO → amarillo · diferencia > 0.01 → rojo · resto → verde.
   */
  semaforoDe(row: ConciliacionAirhspRow): SemaforoConciliacion {
    if (row.estado === 'JUSTIFICADO') return 'amarillo';
    if (Math.abs(row.diferencia ?? 0) > 0.01) return 'rojo';
    return 'verde';
  }

  nombreEmpleado(empleadoId: number): string {
    return this.nombrePorEmpleado().get(empleadoId) ?? `Empleado #${empleadoId}`;
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  // ============ Revisión (justificar / rechazar) ============

  revisar(row: ConciliacionAirhspRow): void {
    const ref = this.dialogs.open(
      ConciliacionRevisionDialogComponent,
      sisrhFormDialogConfig('md', {
        data: {
          nombre: this.nombreEmpleado(row.empleadoId),
          diferencia: row.diferencia ?? 0,
        },
      }),
    );
    void ref.afterClosed().subscribe((result: ConciliacionRevisionResult | undefined) => {
      if (result) this.aplicarRevision(row, result);
    });
  }

  private aplicarRevision(row: ConciliacionAirhspRow, result: ConciliacionRevisionResult): void {
    this.conciliacionApi
      .revisar(row.id, { estado: result.estado, justificacion: result.justificacion })
      .subscribe({
        next: () => {
          this.snack.open('Conciliación revisada.', 'Cerrar', { duration: 4000 });
          this.cargarConciliaciones();
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
  }

  // ============ Carga de datos ============

  private cargarBase(): void {
    this.loading.set(true);
    forkJoin({
      periodos: this.periodoApi.listar(),
      personas: this.personaApi.listar(),
    }).subscribe({
      next: ({ periodos, personas }) => {
        const ordenados = [...periodos].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        const mapa = new Map<number, string>();
        for (const p of personas) {
          if (p.empleadoId != null) mapa.set(p.empleadoId, p.nombreCompleto);
        }
        this.nombrePorEmpleado.set(mapa);
        this.loading.set(false);
        const inicial = ordenados.find((p) => p.estado === 'ABIERTO') ?? ordenados[0];
        if (inicial) this.onPeriodoChange(inicial.periodo);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarConciliaciones(): void {
    const periodo = this.periodoActivo();
    if (periodo == null) return;
    this.tableLoading.set(true);
    this.conciliacionApi.listarPorPeriodo(periodo.id).subscribe({
      next: (filas) => {
        this.conciliaciones.set(filas);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.conciliaciones.set([]);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Helpers ============

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
