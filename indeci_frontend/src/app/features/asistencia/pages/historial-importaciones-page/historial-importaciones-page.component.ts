import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, map, of, switchMap, takeWhile, timer } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import type {
  AsistenciaImportHistorial,
  AsistenciaValidacionBatch,
} from '../../models/asistencia-import.model';
import {
  CalculoProgresoCircularComponent,
  type EstadoProgresoCircular,
} from '../../components/calculo-progreso-circular/calculo-progreso-circular.component';

@Component({
  selector: 'app-historial-importaciones-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    CalculoProgresoCircularComponent,
  ],
  templateUrl: './historial-importaciones-page.component.html',
  styleUrl: './historial-importaciones-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialImportacionesPageComponent implements OnInit {
  private readonly importApi = inject(AsistenciaImportApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private static readonly POLL_MS = 700;

  readonly columnas = ['fecha', 'periodo', 'archivo', 'estado', 'validacion', 'filas', 'empleados', 'usuario', 'acciones'] as const;
  readonly periodoFiltro = signal('');
  readonly rows = signal<readonly AsistenciaImportHistorial[]>([]);
  readonly loading = signal(false);
  /** Fila cuyo "Ejecutar cálculo" está en curso (muestra el indicador circular). */
  readonly validandoImportacionId = signal<number | null>(null);
  // Estado del indicador circular de "Ejecutar cálculo" (Opción B).
  readonly calcProgreso = signal(0);
  readonly calcFase = signal('');
  readonly calcEstado = signal<EstadoProgresoCircular>('PROCESANDO');
  readonly calcError = signal<string | null>(null);
  readonly periodosConPlanilla = signal<ReadonlySet<string>>(new Set());
  readonly total = signal(0);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    const periodo = this.periodoFiltro().trim() || null;
    this.importApi.historial(periodo).subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
        this.cargarPeriodosConPlanilla(page.content);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  fmtFecha(value: string | null | undefined): string {
    if (value == null || value.length === 0) {
      return '-';
    }
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  /** Abre el detalle de la importación (asistencia consolidada del lote, solo lectura). */
  verDetalle(row: AsistenciaImportHistorial): void {
    this.router.navigate(['/asistencia/importaciones', row.id]);
  }

  /**
   * "Ejecutar cálculo" ASÍNCRONO (Opción B). Dispara el job y hace polling declarativo del progreso,
   * mostrando el indicador CIRCULAR en la fila. Al completar, recarga el historial (el badge de
   * validación refleja el resultado). Safe-submit: no permite un segundo cálculo simultáneo.
   */
  validarCabeceras(row: AsistenciaImportHistorial): void {
    if (this.validandoImportacionId() != null) {
      return;
    }
    this.validandoImportacionId.set(row.id);
    this.calcEstado.set('PROCESANDO');
    this.calcProgreso.set(0);
    this.calcFase.set('Iniciando cálculo…');
    this.calcError.set(null);

    this.importApi
      .validarCabecerasAsync(row.id)
      .pipe(
        switchMap(({ jobId }) =>
          timer(0, HistorialImportacionesPageComponent.POLL_MS).pipe(
            switchMap(() => this.importApi.jobEstado(jobId)),
            takeWhile((job) => job.estado === 'EN_COLA' || job.estado === 'PROCESANDO', true),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (job) => {
          this.calcProgreso.set(job.porcentaje);
          this.calcFase.set(job.fase);
          if (job.estado === 'COMPLETADO') {
            this.calcProgreso.set(100);
            this.calcEstado.set('COMPLETADO');
            const r = job.resultado as AsistenciaValidacionBatch | null;
            this.snack.open(
              this.mensajeValidacion(row.periodo, r?.validadas ?? 0, r?.observadas ?? 0),
              'Cerrar',
              { duration: 8000 },
            );
            this.validandoImportacionId.set(null);
            this.cargar(); // recarga → el badge de la fila refleja el resultado
          } else if (job.estado === 'ERROR') {
            this.calcEstado.set('ERROR');
            this.calcError.set(job.error ?? 'El cálculo falló.');
            this.validandoImportacionId.set(null);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.calcEstado.set('ERROR');
          this.calcError.set(this.errorHttp(err));
          this.validandoImportacionId.set(null);
        },
      });
  }

  private errorHttp(err: HttpErrorResponse): string {
    const body = err?.error;
    return isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
  }

  /** Solo se ofrece "Ejecutar cálculo" cuando quedan cabeceras sin validar (nunca se ejecutó). */
  requiereCalculo(row: AsistenciaImportHistorial): boolean {
    return row.estadoValidacion === 'REQUIERE_CALCULO';
  }

  /** Se ejecutó el cálculo, pero quedan cabeceras observadas por corregir (Opción B). */
  esParcial(row: AsistenciaImportHistorial): boolean {
    return row.estadoValidacion === 'PARCIAL';
  }

  esValidado(row: AsistenciaImportHistorial): boolean {
    return row.estadoValidacion === 'VALIDADO';
  }

  /** Abre el detalle del lote filtrado a las cabeceras observadas (días OBSERVADO por corregir). */
  verObservadas(row: AsistenciaImportHistorial): void {
    this.router.navigate(['/asistencia/importaciones', row.id], {
      queryParams: { tipoDia: 'OBSERVADO' },
    });
  }

  requiereRecalculo(row: AsistenciaImportHistorial): boolean {
    return this.periodosConPlanilla().has(row.periodo);
  }

  private cargarPeriodosConPlanilla(rows: readonly AsistenciaImportHistorial[]): void {
    const periodos = Array.from(new Set(rows.map((row) => row.periodo)));
    if (periodos.length === 0) {
      this.periodosConPlanilla.set(new Set());
      return;
    }
    const checks = periodos.map((periodo) =>
      this.movimientoApi.listarPeriodo(periodo).pipe(
        map((movimientos) => ({ periodo, tienePlanilla: movimientos.length > 0 })),
        catchError(() => of({ periodo, tienePlanilla: false })),
      ),
    );
    forkJoin(checks).subscribe((resultados) => {
      this.periodosConPlanilla.set(
        new Set(resultados.filter((r) => r.tienePlanilla).map((r) => r.periodo)),
      );
    });
  }

  private mensajeValidacion(periodo: string, validadas: number, observadas: number): string {
    const base = `Cabeceras validadas: ${validadas}. Observadas: ${observadas}.`;
    if (!this.periodosConPlanilla().has(periodo)) {
      return base;
    }
    return `${base} El periodo ya tiene planilla generada; ejecute el recálculo para reflejar la asistencia.`;
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
