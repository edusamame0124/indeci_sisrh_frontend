import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { AsistenciaEmpleadoApiService } from '../../services/asistencia-empleado-api';
import {
  DiaCalendarioAsistenciaEmpleado,
  EstadoDiaAsistenciaEmpleado,
  MiAsistenciaEmpleado,
} from '../../models/asistencia-empleado.model';
import type { AsistenciaDiariaRow } from '../../../asistencia/models/asistencia-diaria.model';
import { badgeClass, condicionLabel, fmtMin } from '../../../../shared/utils/asistencia-display.utils';

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hoyIso(): string {
  return toIsoDate(new Date()) ?? '';
}

/** Primer día del mes actual (ISO) — valor por defecto de "Fecha de inicio" en la consulta por rango. */
function primerDiaMesIso(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)) ?? '';
}

@Component({
  selector: 'app-mis-asistencias-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    EmptyStateComponent,
  ],
  templateUrl: './mis-asistencias-page.html',
  styleUrl: './mis-asistencias-page.scss',
})
export class MisAsistenciasPage implements OnInit {
  private readonly asistenciaApi = inject(AsistenciaEmpleadoApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly asistencias = signal<MiAsistenciaEmpleado[]>([]);

  readonly fechaVista = signal(new Date());

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  private readonly cachePorMes = new Map<string, MiAsistenciaEmpleado[]>();

  /**
   * Estados visibles en la leyenda del calendario mensual. La etiqueta se deriva de
   * `condicionLabel` (fuente única compartida) — no se hardcodea un texto paralelo que pueda
   * desincronizarse (bug real: esta leyenda decía "Laboral" mientras el resto del sistema ya
   * usaba "Presente").
   */
  private static readonly ESTADOS_LEYENDA: readonly EstadoDiaAsistenciaEmpleado[] = [
    'LABORAL', 'TARDANZA', 'FALTA', 'LICENCIA', 'VACACIONES', 'DESCANSO', 'FERIADO', 'OBSERVADO',
  ];

  readonly leyenda: {
    estado: EstadoDiaAsistenciaEmpleado;
    label: string;
    className: string;
  }[] = MisAsistenciasPage.ESTADOS_LEYENDA.map((estado) => ({
    estado,
    label: condicionLabel(estado),
    className: estado.toLowerCase(),
  }));

  readonly tituloMes = computed(() => {
    const fecha = this.fechaVista();

    return new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
    }).format(fecha);
  });

  readonly diasCalendario = computed(() =>
    this.construirCalendario(this.fechaVista(), this.asistencias()),
  );

  // ==========================================
  // Tab "Consulta por rango"
  // ==========================================

  readonly rangoCols = ['fecha', 'tipo', 'entrada', 'salida', 'tardanza', 'observacion'] as const;

  readonly rangoFechaInicio = signal<Date | null>(parseIsoDate(primerDiaMesIso()));
  readonly rangoFechaFin = signal<Date | null>(parseIsoDate(hoyIso()));
  readonly rangoConsultaEjecutada = signal(false);
  readonly rangoRows = signal<readonly AsistenciaDiariaRow[]>([]);
  readonly rangoTotal = signal(0);
  readonly rangoPageIndex = signal(0);
  readonly rangoPageSize = signal(10);
  readonly rangoLoading = signal(false);
  readonly rangoError = signal<string | null>(null);
  readonly rangoExportando = signal(false);

  /** El rango es válido cuando ambas fechas existen y fin ≥ inicio. */
  readonly rangoValido = computed(() => {
    const ini = this.rangoFechaInicio();
    const fin = this.rangoFechaFin();
    return !!ini && !!fin && fin.getTime() >= ini.getTime();
  });

  readonly condicionLabel = condicionLabel;
  readonly badgeClass = badgeClass;
  readonly fmtMin = fmtMin;

  ngOnInit(): void {
    this.cargarAsistencias();
  }

  cargarAsistencias(): void {
    this.error.set(null);

    const rango = this.obtenerRangoMes(this.fechaVista());
    const cacheKey = `${rango.fechaInicio}_${rango.fechaFin}`;

    const dataCache = this.cachePorMes.get(cacheKey);
    if (dataCache) {
      this.asistencias.set(dataCache);
      return;
    }

    this.cargando.set(true);

    this.asistenciaApi.listarMisAsistencias(rango.fechaInicio, rango.fechaFin).subscribe({
      next: (resp: any) => {
        const lista: MiAsistenciaEmpleado[] = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : [];

        this.cachePorMes.set(cacheKey, lista);
        this.asistencias.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando mis asistencias:', err);
        this.error.set('No se pudieron cargar sus asistencias.');
        this.asistencias.set([]);
        this.cargando.set(false);
      },
    });
  }

  obtenerClaseDia(dia: DiaCalendarioAsistenciaEmpleado): string {
    return [
      'dia-card',
      dia.mesActual ? 'mes-actual' : 'otro-mes',
      this.claseEstado(dia.estado),
    ].join(' ');
  }

  claseEstado(estado: EstadoDiaAsistenciaEmpleado): string {
    return estado.toLowerCase().replace('_', '-');
  }

  obtenerMinutosTardanza(item?: MiAsistenciaEmpleado | null): number {
    return item?.minutosTardanza ?? item?.tardanzaMinutos ?? 0;
  }

  obtenerMontoDescuento(item?: MiAsistenciaEmpleado | null): number {
    return item?.montoDescuento ?? item?.descuento ?? 0;
  }

  private construirCalendario(
    fechaVista: Date,
    asistencias: MiAsistenciaEmpleado[],
  ): DiaCalendarioAsistenciaEmpleado[] {
    const listaAsistencias = Array.isArray(asistencias) ? asistencias : [];
    const anio = fechaVista.getFullYear();
    const mes = fechaVista.getMonth();

    const primeroMes = new Date(anio, mes, 1);

    const inicioCalendario = new Date(primeroMes);
    const diaSemanaInicio = this.obtenerDiaSemanaLunesPrimero(primeroMes);

    inicioCalendario.setDate(primeroMes.getDate() - diaSemanaInicio);

    const asistenciasPorFecha = new Map<string, MiAsistenciaEmpleado>();

    for (const asistencia of listaAsistencias) {
      if (asistencia.fecha) {
        asistenciasPorFecha.set(asistencia.fecha.substring(0, 10), asistencia);
      }
    }

    const dias: DiaCalendarioAsistenciaEmpleado[] = [];
    const totalCeldas = 42;

    for (let i = 0; i < totalCeldas; i++) {
      const fecha = new Date(inicioCalendario);
      fecha.setDate(inicioCalendario.getDate() + i);

      const fechaTexto = this.formatearFechaLocal(fecha);
      const asistencia = asistenciasPorFecha.get(fechaTexto) ?? null;

      dias.push({
        fecha: fechaTexto,
        dia: fecha.getDate(),
        mesActual: fecha.getMonth() === mes,
        estado: this.obtenerEstadoDia(fecha, asistencia),
        asistencia,
      });
    }

    return dias;
  }

  private obtenerEstadoDia(
    fecha: Date,
    asistencia?: MiAsistenciaEmpleado | null,
  ): EstadoDiaAsistenciaEmpleado {
    if (asistencia) {
      const estadoRaw =
        asistencia.tipoDia ??
        asistencia.estadoAsistencia ??
        asistencia.estado ??
        asistencia.tipo ??
        '';

      const estado = estadoRaw.toString().trim().toUpperCase().replaceAll(' ', '_');

      if (estado.includes('TARDANZA')) return 'TARDANZA';
      if (estado.includes('FALTA')) return 'FALTA';
      if (estado.includes('LICENCIA')) return 'LICENCIA';
      if (estado.includes('VACACION')) return 'VACACIONES';
      if (estado.includes('DESCANSO')) return 'DESCANSO';
      if (estado.includes('FERIADO')) return 'FERIADO';
      if (estado.includes('OBSERV')) return 'OBSERVADO';
      if (estado.includes('LABORAL')) return 'LABORAL';

      if (this.obtenerMinutosTardanza(asistencia) > 0) {
        return 'TARDANZA';
      }

      return 'LABORAL';
    }

    const diaSemana = fecha.getDay();

    if (diaSemana === 0 || diaSemana === 6) {
      return 'DESCANSO';
    }

    return 'SIN_REGISTRO';
  }

  private obtenerDiaSemanaLunesPrimero(fecha: Date): number {
    const dia = fecha.getDay();

    return dia === 0 ? 6 : dia - 1;
  }

  private formatearFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private obtenerRangoMes(fecha: Date): { fechaInicio: string; fechaFin: string } {
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();

    const inicio = new Date(anio, mes, 1);
    const fin = new Date(anio, mes + 1, 0);

    return {
      fechaInicio: this.formatearFechaLocal(inicio),
      fechaFin: this.formatearFechaLocal(fin),
    };
  }
  mesAnterior(): void {
    const actual = this.fechaVista();
    this.fechaVista.set(new Date(actual.getFullYear(), actual.getMonth() - 1, 1));
    this.cargarAsistencias();
  }

  mesSiguiente(): void {
    const actual = this.fechaVista();
    this.fechaVista.set(new Date(actual.getFullYear(), actual.getMonth() + 1, 1));
    this.cargarAsistencias();
  }

  irMesActual(): void {
    this.fechaVista.set(new Date());
    this.cargarAsistencias();
  }

  // ==========================================
  // Tab "Consulta por rango"
  // ==========================================

  buscarRango(): void {
    if (!this.rangoValido()) {
      this.rangoError.set('La fecha fin debe ser posterior o igual a la de inicio.');
      return;
    }
    this.rangoConsultaEjecutada.set(true);
    this.rangoPageIndex.set(0);
    this.cargarRango();
  }

  onPageRango(ev: PageEvent): void {
    this.rangoPageIndex.set(ev.pageIndex);
    this.rangoPageSize.set(ev.pageSize);
    if (this.rangoValido()) this.cargarRango();
  }

  indiceFilaRango(i: number): number {
    return this.rangoPageIndex() * this.rangoPageSize() + i + 1;
  }

  private cargarRango(): void {
    const fechaInicio = toIsoDate(this.rangoFechaInicio());
    const fechaFin = toIsoDate(this.rangoFechaFin());
    if (!fechaInicio || !fechaFin) return;

    this.rangoLoading.set(true);
    this.rangoError.set(null);

    this.asistenciaApi
      .listarMisAsistenciasPage(fechaInicio, fechaFin, this.rangoPageIndex(), this.rangoPageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.rangoRows.set(page.content);
          this.rangoTotal.set(page.totalElements);
          this.rangoLoading.set(false);
        },
        error: (err: unknown) => {
          this.rangoLoading.set(false);
          this.rangoRows.set([]);
          this.rangoTotal.set(0);
          const body = err instanceof HttpErrorResponse ? err.error : null;
          this.rangoError.set(
            isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
          );
        },
      });
  }

  descargarPdfRango(): void {
    const fechaInicio = toIsoDate(this.rangoFechaInicio());
    const fechaFin = toIsoDate(this.rangoFechaFin());
    if (!fechaInicio || !fechaFin || this.rangoExportando()) return;

    this.rangoExportando.set(true);
    this.asistenciaApi
      .descargarPdfRango(fechaInicio, fechaFin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `mis-asistencias-${fechaInicio}_${fechaFin}.pdf`;
          enlace.click();
          URL.revokeObjectURL(url);
          this.rangoExportando.set(false);
        },
        error: (err: unknown) => {
          this.rangoExportando.set(false);
          const body = err instanceof HttpErrorResponse ? err.error : null;
          this.rangoError.set(
            isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
          );
        },
      });
  }
}
