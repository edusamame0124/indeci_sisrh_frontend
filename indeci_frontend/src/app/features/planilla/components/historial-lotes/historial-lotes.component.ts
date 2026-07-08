import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { PlanillaLoteDashboardRow } from '../../models/planilla-lote.model';

/**
 * Componente presentacional reutilizable — Historial de lotes de planilla.
 *
 * Muestra los lotes generados (uno por proceso) en una tabla institucional con
 * su estado, conteo de trabajadores, neto total, fecha y acceso al detalle de
 * movimientos. Es "tonto": recibe la data ya filtrada por quien lo usa
 * (p. ej. `tipoPlanilla === 'ORDINARIA'` en "Nuevo proceso de planilla") y no
 * consulta servicios por su cuenta.
 *
 * Usa los nombres de campo reales del DTO backend (`cantidadEmpleados`,
 * `montoTotalNeto`) para que las columnas muestren datos correctamente.
 */
@Component({
  selector: 'app-historial-lotes',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-lotes.component.html',
  styleUrl: './historial-lotes.component.scss',
})
export class HistorialLotesComponent {
  /** Lotes a mostrar (ya filtrados por el contenedor). */
  readonly lotes = input.required<readonly PlanillaLoteDashboardRow[]>();

  /** Muestra la barra de progreso mientras el contenedor carga la data. */
  readonly cargando = input(false);

  /** Texto del estado vacío (personalizable por módulo). */
  readonly mensajeVacio = input(
    'Aún no hay planillas generadas para el periodo seleccionado.',
  );

  readonly columnas = [
    'id',
    'periodo',
    'regimenLaboralCodigo',
    'estado',
    'cantidadEmpleados',
    'montoTotalNeto',
    'creadoEn',
    'acciones',
  ] as const;

  readonly sinDatos = computed(() => this.lotes().length === 0);

  /** Clase de badge según el estado del lote (texto + color, no solo color). */
  badgeClase(estado: string | null | undefined): string {
    switch ((estado ?? '').toUpperCase()) {
      case 'GENERADO':
      case 'PROCESADO':
      case 'APROBADO':
        return 'badge badge-success';
      case 'ABIERTO':
        return 'badge badge-info';
      case 'OBSERVADO':
      case 'ANULADO':
        return 'badge badge-danger';
      case 'PENDIENTE':
      case 'EN_REVISION':
        return 'badge badge-warning';
      default:
        return 'badge';
    }
  }
}
