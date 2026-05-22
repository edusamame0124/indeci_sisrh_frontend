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
import { forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';

/** Columna ordenable de la tabla. */
export type ColumnaResumen = 'empleado' | 'ingresos' | 'descuentos' | 'neto' | 'deltaNeto';

/** Fila del resumen general (SPEC §12.2 PANTALLA-04 — hoja RES.GENERAL). */
export interface ResumenGeneralRow {
  readonly empleadoId: number;
  readonly nombre: string;
  readonly ingresos: number;
  readonly descuentos: number;
  readonly neto: number;
  /** Neto del período anterior; null si el empleado no estaba. */
  readonly netoAnterior: number | null;
  /** neto − netoAnterior; null si no hay período anterior con el empleado. */
  readonly deltaNeto: number | null;
  /** Variación porcentual; null si netoAnterior es null o 0. */
  readonly deltaPct: number | null;
}

/**
 * PANTALLA-04 — Resumen General (SPEC §12.2, ROL_RRHH + ROL_CONTABILIDAD).
 * Equivale a la hoja RES.GENERAL del Excel.
 *
 * - Tabla por empleado: ingresos · descuentos · neto, con totales por columna.
 * - Comparativo del neto vs el período anterior (delta en S/ y %).
 * - Columnas ordenables y paginación client-side.
 * - Exportación a CSV (abre en Excel) compatible con carga AIRHSP.
 */
@Component({
  selector: 'app-resumen-mensual-page',
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resumen-mensual-page.component.html',
  styleUrl: './resumen-mensual-page.component.css',
})
export class ResumenMensualPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['empleado', 'ingresos', 'descuentos', 'neto', 'deltaNeto'] as const;
  readonly pageSizeOptions = [10, 25, 50] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly nombrePorEmpleado = signal<ReadonlyMap<number, string>>(new Map());
  readonly movimientosActual = signal<readonly MovimientoPlanillaRow[]>([]);
  readonly movimientosAnterior = signal<readonly MovimientoPlanillaRow[]>([]);

  readonly loading = signal(true);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);
  readonly sortCol = signal<ColumnaResumen>('empleado');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  /** Período inmediatamente anterior al seleccionado (para el comparativo). */
  readonly periodoAnterior = computed(() => {
    const sel = this.periodoSeleccionado();
    if (sel == null) return null;
    const orden = [...this.periodos()]
      .map((p) => p.periodo)
      .sort((a, b) => b.localeCompare(a));
    const idx = orden.indexOf(sel);
    return idx >= 0 && idx + 1 < orden.length ? orden[idx + 1] : null;
  });

  /** Filas del resumen: une movimientos + nombres + comparativo. */
  readonly rows = computed<readonly ResumenGeneralRow[]>(() => {
    const nombres = this.nombrePorEmpleado();
    const netoPrevio = new Map<number, number>();
    for (const m of this.movimientosAnterior()) {
      netoPrevio.set(m.empleadoId, m.netoPagar);
    }
    return this.movimientosActual().map((m) => {
      const netoAnterior = netoPrevio.has(m.empleadoId)
        ? (netoPrevio.get(m.empleadoId) as number)
        : null;
      const deltaNeto = netoAnterior == null ? null : this.round2(m.netoPagar - netoAnterior);
      const deltaPct =
        netoAnterior == null || netoAnterior === 0
          ? null
          : this.round2(((m.netoPagar - netoAnterior) / netoAnterior) * 100);
      return {
        empleadoId: m.empleadoId,
        nombre: nombres.get(m.empleadoId) ?? `Empleado #${m.empleadoId}`,
        ingresos: m.totalIngresos,
        descuentos: m.totalDescuentos,
        neto: m.netoPagar,
        netoAnterior,
        deltaNeto,
        deltaPct,
      };
    });
  });

  /** Filas ordenadas por la columna activa. */
  readonly rowsOrdenadas = computed<readonly ResumenGeneralRow[]>(() => {
    const col = this.sortCol();
    const factor = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.rows()].sort((a, b) => {
      let cmp: number;
      if (col === 'empleado') {
        cmp = a.nombre.localeCompare(b.nombre);
      } else {
        cmp = this.valorOrden(a, col) - this.valorOrden(b, col);
      }
      return cmp * factor;
    });
  });

  readonly pagedRows = computed<readonly ResumenGeneralRow[]>(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.rowsOrdenadas().slice(start, start + this.pageSize());
  });

  /** Totales por columna sobre todas las filas del período. */
  readonly totales = computed(() => {
    let ingresos = 0;
    let descuentos = 0;
    let neto = 0;
    for (const r of this.rows()) {
      ingresos += r.ingresos;
      descuentos += r.descuentos;
      neto += r.neto;
    }
    return {
      ingresos: this.round2(ingresos),
      descuentos: this.round2(descuentos),
      neto: this.round2(neto),
    };
  });

  ngOnInit(): void {
    this.cargarBase();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.pageIndex.set(0);
    this.cargarMovimientos();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  /** Ordena por la columna; si ya estaba activa, invierte la dirección. */
  onSort(col: ColumnaResumen): void {
    if (this.sortCol() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
    this.pageIndex.set(0);
  }

  /** Ícono de orden de una columna (vacío si no es la activa). */
  iconoOrden(col: ColumnaResumen): string {
    if (this.sortCol() !== col) return '';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  // ============ Exportación CSV (compatible con Excel / AIRHSP) ============

  /** Construye el contenido CSV del resumen (separador `;`, decimales con punto). */
  construirCsv(): string {
    const cab = [
      'Empleado',
      'Ingresos',
      'Descuentos',
      'Neto',
      'Neto anterior',
      'Delta neto',
      'Delta %',
    ].join(';');

    const filas = this.rowsOrdenadas().map((r) =>
      [
        `"${r.nombre.replace(/"/g, '""')}"`,
        r.ingresos.toFixed(2),
        r.descuentos.toFixed(2),
        r.neto.toFixed(2),
        r.netoAnterior == null ? '' : r.netoAnterior.toFixed(2),
        r.deltaNeto == null ? '' : r.deltaNeto.toFixed(2),
        r.deltaPct == null ? '' : r.deltaPct.toFixed(2),
      ].join(';'),
    );

    const t = this.totales();
    const totalRow = [
      'TOTALES',
      t.ingresos.toFixed(2),
      t.descuentos.toFixed(2),
      t.neto.toFixed(2),
      '',
      '',
      '',
    ].join(';');

    return [cab, ...filas, totalRow].join('\r\n');
  }

  exportarCsv(): void {
    if (this.rows().length === 0) {
      this.snack.open('No hay datos para exportar en este período.', 'Cerrar', {
        duration: 5000,
      });
      return;
    }
    const contenido = '﻿' + this.construirCsv();
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-general-${this.periodoSeleccionado() ?? 'periodo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  private cargarMovimientos(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo == null) return;
    const anterior = this.periodoAnterior();

    this.tableLoading.set(true);
    forkJoin({
      actual: this.movimientoApi.listarPeriodo(periodo),
      anterior: anterior ? this.movimientoApi.listarPeriodo(anterior) : of([]),
    }).subscribe({
      next: ({ actual, anterior: previo }) => {
        this.movimientosActual.set(actual);
        this.movimientosAnterior.set(previo);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.movimientosActual.set([]);
        this.movimientosAnterior.set([]);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Helpers ============

  private valorOrden(row: ResumenGeneralRow, col: ColumnaResumen): number {
    switch (col) {
      case 'ingresos':
        return row.ingresos;
      case 'descuentos':
        return row.descuentos;
      case 'neto':
        return row.neto;
      case 'deltaNeto':
        return row.deltaNeto ?? Number.NEGATIVE_INFINITY;
      default:
        return 0;
    }
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
