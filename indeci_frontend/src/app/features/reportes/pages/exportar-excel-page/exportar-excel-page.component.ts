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
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';

/** Fila de la exportación de planilla del período. */
interface FilaExport {
  readonly empleado: string;
  readonly ingresos: number;
  readonly descuentos: number;
  readonly neto: number;
  readonly estado: string;
}

/**
 * Reporte — Exportar planilla a Excel/CSV (Spec 011 / B6).
 * Descarga la planilla del período (un movimiento por empleado) como CSV.
 */
@Component({
  selector: 'app-exportar-excel-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exportar-excel-page.component.html',
  styleUrl: './exportar-excel-page.component.css',
})
export class ExportarExcelPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['empleado', 'ingresos', 'descuentos', 'neto', 'estado'] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly nombrePorEmpleado = signal<ReadonlyMap<number, string>>(new Map());
  readonly movimientos = signal<readonly MovimientoPlanillaRow[]>([]);

  readonly loading = signal(true);
  readonly tableLoading = signal(false);

  /** Filas de la exportación: movimientos del período + nombre del empleado. */
  readonly filas = computed<readonly FilaExport[]>(() => {
    const nombres = this.nombrePorEmpleado();
    return this.movimientos()
      .map((m) => ({
        empleado: nombres.get(m.empleadoId) ?? `Empleado #${m.empleadoId}`,
        ingresos: m.totalIngresos,
        descuentos: m.totalDescuentos,
        neto: m.netoPagar,
        estado: m.estado,
      }))
      .sort((a, b) => a.empleado.localeCompare(b.empleado));
  });

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    this.cargarBase();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarMovimientos(periodo);
  }

  /** Construye el CSV de la planilla del período (separador `;`). */
  construirCsv(): string {
    const cab = ['Empleado', 'Ingresos', 'Descuentos', 'Neto', 'Estado'].join(';');
    const filas = this.filas().map((f) =>
      [
        `"${f.empleado.replace(/"/g, '""')}"`,
        f.ingresos.toFixed(2),
        f.descuentos.toFixed(2),
        f.neto.toFixed(2),
        f.estado,
      ].join(';'),
    );
    return [cab, ...filas].join('\r\n');
  }

  exportarCsv(): void {
    if (this.filas().length === 0) {
      this.snack.open('No hay datos para exportar en este período.', 'Cerrar', {
        duration: 5000,
      });
      return;
    }
    const blob = new Blob(['﻿' + this.construirCsv()], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla-${this.periodoSeleccionado() ?? 'periodo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  private cargarMovimientos(periodo: string): void {
    this.tableLoading.set(true);
    this.movimientoApi.listarPeriodo(periodo).subscribe({
      next: (rows) => {
        this.movimientos.set(rows);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.movimientos.set([]);
        this.onHttpSnack(err);
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
