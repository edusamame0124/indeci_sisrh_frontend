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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { ResumenMetaRow } from '../../../planilla/models/resumen-meta.model';

/**
 * PANTALLA-05 — Resumen por Meta Presupuestal (SPEC §12.2, ROL_CONTABILIDAD).
 * Equivale a las hojas RES.COMPROMISO + RES.METAS del Excel.
 *
 * - Tabla por meta: centro costo · PEA · ingresos · ESSALUD · aportes · total.
 * - Detalle expandible por meta con la lista de empleados.
 * - Totales generales en el pie de la tabla.
 */
@Component({
  selector: 'app-resumen-meta-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resumen-meta-page.component.html',
  styleUrl: './resumen-meta-page.component.css',
})
export class ResumenMetaPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'meta',
    'centroCosto',
    'pea',
    'ingresos',
    'essalud',
    'aportes',
    'total',
    'expand',
  ] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly nombrePorEmpleado = signal<ReadonlyMap<number, string>>(new Map());
  readonly metas = signal<readonly ResumenMetaRow[]>([]);
  readonly metaExpandida = signal<string | null>(null);

  readonly loading = signal(true);
  readonly tableLoading = signal(false);

  /** Totales generales sobre todas las metas del período. */
  readonly totalesGenerales = computed(() => {
    let pea = 0;
    let ingresos = 0;
    let essalud = 0;
    let aportes = 0;
    let total = 0;
    for (const m of this.metas()) {
      pea += m.pea;
      ingresos += m.ingresos;
      essalud += m.essalud;
      aportes += m.aportes;
      total += m.total;
    }
    return {
      pea,
      ingresos: this.round2(ingresos),
      essalud: this.round2(essalud),
      aportes: this.round2(aportes),
      total: this.round2(total),
    };
  });

  ngOnInit(): void {
    this.cargarBase();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.metaExpandida.set(null);
    this.cargarMetas();
  }

  /** Expande/colapsa el detalle de empleados de una meta. */
  toggle(meta: string): void {
    this.metaExpandida.set(this.metaExpandida() === meta ? null : meta);
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
        this.onError(err);
      },
    });
  }

  private cargarMetas(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo == null) return;
    this.tableLoading.set(true);
    this.movimientoApi.resumenPorMeta(periodo).subscribe({
      next: (filas) => {
        this.metas.set(filas);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.metas.set([]);
        this.onError(err);
      },
    });
  }

  // ============ Helpers ============

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private onError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
