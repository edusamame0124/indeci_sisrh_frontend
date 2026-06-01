import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ReporteConsolidadoApiService } from '../../services/reporte-consolidado-api.service';
import type {
  ReporteEvolucionResponse,
  ReporteRegimenResponse,
  ReporteTopConceptosResponse,
} from '../../models/reporte-consolidado.model';

/**
 * F3.5 — Tablero Consolidado.
 *
 * <p>3 tabs solo-lectura sobre datos ya grabados:</p>
 * <ol>
 *   <li><strong>Evolución</strong>: tabla por período + KPI agregados.</li>
 *   <li><strong>Régimen</strong>: distribución por régimen laboral con barras.</li>
 *   <li><strong>Top conceptos</strong>: ranking de conceptos del período.</li>
 * </ol>
 *
 * <p>Ruta: {@code /reportes/consolidado}.</p>
 */
@Component({
  selector: 'app-reportes-consolidado-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes-consolidado-page.component.html',
  styleUrl: './reportes-consolidado-page.component.css',
})
export class ReportesConsolidadoPageComponent implements OnInit {
  private readonly api = inject(ReporteConsolidadoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  private static periodoActual(): string {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = (ahora.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }

  // ===================== Form controls =====================

  /** Período compartido entre los 3 tabs. */
  readonly periodoCtrl = new FormControl<string>(
    ReportesConsolidadoPageComponent.periodoActual(),
    { nonNullable: true },
  );
  /** Ventana de la evolución. */
  readonly mesesCtrl = new FormControl<number>(6, { nonNullable: true });
  /** Límite del top conceptos. */
  readonly limiteCtrl = new FormControl<number>(10, { nonNullable: true });

  readonly mesesOpciones = [3, 6, 12] as const;
  readonly limiteOpciones = [10, 20, 50] as const;

  // ===================== State =====================

  readonly evolucion = signal<ReporteEvolucionResponse | null>(null);
  readonly regimen = signal<ReporteRegimenResponse | null>(null);
  readonly topConceptos = signal<ReporteTopConceptosResponse | null>(null);

  readonly loadingEvolucion = signal(false);
  readonly loadingRegimen = signal(false);
  readonly loadingTop = signal(false);

  readonly tabActivo = signal(0);

  readonly columnasEvolucion = [
    'periodo', 'empleados', 'ingresos', 'descuentos', 'neto', 'aporteEmp', 'netoNoVa', 'delta',
  ] as const;
  readonly columnasRegimen = [
    'regimen', 'empleados', 'ingresos', 'neto', 'netoPromedio', 'porcentaje',
  ] as const;
  readonly columnasTop = [
    'rank', 'codigo', 'nombre', 'tipo', 'empleados', 'monto', 'porcentaje',
  ] as const;

  // ===================== Lifecycle =====================

  ngOnInit(): void {
    this.cargarTabActivo();
  }

  onTabChange(idx: number): void {
    this.tabActivo.set(idx);
    this.cargarTabActivo();
  }

  recargar(): void {
    this.cargarTabActivo();
  }

  private cargarTabActivo(): void {
    switch (this.tabActivo()) {
      case 0: this.cargarEvolucion(); break;
      case 1: this.cargarRegimen(); break;
      case 2: this.cargarTopConceptos(); break;
    }
  }

  // ===================== Cargas =====================

  cargarEvolucion(): void {
    const periodo = this.periodoCtrl.value;
    const meses = this.mesesCtrl.value;
    if (!this.validarPeriodo(periodo)) return;
    this.loadingEvolucion.set(true);
    this.api.evolucion(periodo, meses).subscribe({
      next: (r) => {
        this.evolucion.set(r);
        this.loadingEvolucion.set(false);
      },
      error: (err) => {
        this.loadingEvolucion.set(false);
        this.evolucion.set(null);
        this.onHttpSnack(err);
      },
    });
  }

  cargarRegimen(): void {
    const periodo = this.periodoCtrl.value;
    if (!this.validarPeriodo(periodo)) return;
    this.loadingRegimen.set(true);
    this.api.regimen(periodo).subscribe({
      next: (r) => {
        this.regimen.set(r);
        this.loadingRegimen.set(false);
      },
      error: (err) => {
        this.loadingRegimen.set(false);
        this.regimen.set(null);
        this.onHttpSnack(err);
      },
    });
  }

  cargarTopConceptos(): void {
    const periodo = this.periodoCtrl.value;
    const limite = this.limiteCtrl.value;
    if (!this.validarPeriodo(periodo)) return;
    this.loadingTop.set(true);
    this.api.topConceptos(periodo, limite).subscribe({
      next: (r) => {
        this.topConceptos.set(r);
        this.loadingTop.set(false);
      },
      error: (err) => {
        this.loadingTop.set(false);
        this.topConceptos.set(null);
        this.onHttpSnack(err);
      },
    });
  }

  // ===================== Computed =====================

  readonly evolucionVacia = computed(() => (this.evolucion()?.items.length ?? 0) === 0);
  readonly regimenVacio = computed(() => (this.regimen()?.items.length ?? 0) === 0);
  readonly topVacio = computed(() => (this.topConceptos()?.items.length ?? 0) === 0);

  // ===================== Exports =====================

  exportarEvolucionCsv(): void {
    const r = this.evolucion();
    if (!r || r.items.length === 0) {
      this.snack.open('No hay datos para exportar.', 'Cerrar', { duration: 4000 });
      return;
    }
    const cab = ['Período', 'Empleados', 'Ingresos', 'Descuentos', 'Neto',
      'Aporte empleador', 'Neto no va', 'Δ % vs anterior'].join(';');
    const filas = r.items.map((i) => [
      i.periodo,
      i.conteoEmpleados,
      i.totalIngresos.toFixed(2),
      i.totalDescuentos.toFixed(2),
      i.totalNeto.toFixed(2),
      i.totalAporteEmpleador.toFixed(2),
      i.conteoNetoNoVa,
      i.deltaPctNetoVsAnterior == null ? '' : i.deltaPctNetoVsAnterior.toFixed(2),
    ].join(';'));
    this.descargarCsv(`evolucion-${r.periodoBase}-${r.meses}m.csv`, [cab, ...filas].join('\r\n'));
  }

  exportarTopCsv(): void {
    const r = this.topConceptos();
    if (!r || r.items.length === 0) {
      this.snack.open('No hay datos para exportar.', 'Cerrar', { duration: 4000 });
      return;
    }
    const cab = ['#', 'Código MEF', 'Concepto', 'Tipo', 'Empleados', 'Monto total', '% ingresos'].join(';');
    const filas = r.items.map((i, idx) => [
      idx + 1,
      `"${(i.codigoMef ?? '').replace(/"/g, '""')}"`,
      `"${i.nombre.replace(/"/g, '""')}"`,
      i.tipoConcepto ?? '',
      i.conteoEmpleados,
      i.montoTotal.toFixed(2),
      i.porcentajeIngresos.toFixed(2),
    ].join(';'));
    this.descargarCsv(`top-conceptos-${r.periodo}.csv`, [cab, ...filas].join('\r\n'));
  }

  private descargarCsv(nombre: string, contenido: string): void {
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===================== Validación =====================

  private validarPeriodo(periodo: string): boolean {
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      this.snack.open('Selecciona un período válido (YYYY-MM).', 'Cerrar', { duration: 4000 });
      return false;
    }
    return true;
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }

  // ===================== Presentación =====================

  fmtMonto(v: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v ?? 0);
  }

  fmtPct(v: number | null | undefined): string {
    if (v == null) return '—';
    return `${v.toFixed(2)} %`;
  }

  fmtDeltaPct(v: number | null | undefined): string {
    if (v == null) return '—';
    const signo = v > 0 ? '+' : v < 0 ? '−' : '';
    return `${signo}${Math.abs(v).toFixed(2)} %`;
  }

  severityDelta(v: number | null | undefined): string {
    if (v == null) return 'neutral';
    if (v > 0) return 'success';
    if (v < 0) return 'danger';
    return 'neutral';
  }

  severityTipo(tipo: string | null | undefined): string {
    switch ((tipo ?? '').toUpperCase()) {
      case 'REMUNERATIVO':     return 'success';
      case 'NO_REMUNERATIVO':  return 'info';
      case 'DESCUENTO':        return 'warning';
      case 'APORTE_TRABAJADOR':
      case 'APORTE_EMPLEADOR': return 'info';
      default:                 return 'neutral';
    }
  }

  labelTipo(tipo: string | null | undefined): string {
    switch ((tipo ?? '').toUpperCase()) {
      case 'REMUNERATIVO':      return 'Remunerativo';
      case 'NO_REMUNERATIVO':   return 'No remunerativo';
      case 'DESCUENTO':         return 'Descuento';
      case 'APORTE_TRABAJADOR': return 'Aporte trab.';
      case 'APORTE_EMPLEADOR':  return 'Aporte emp.';
      default:                  return '—';
    }
  }
}
