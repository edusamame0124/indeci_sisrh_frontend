import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import type { AsistenciaImportHistorial } from '../../models/asistencia-import.model';

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
  ],
  templateUrl: './historial-importaciones-page.component.html',
  styleUrl: './historial-importaciones-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialImportacionesPageComponent implements OnInit {
  private readonly importApi = inject(AsistenciaImportApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnas = ['fecha', 'periodo', 'archivo', 'estado', 'filas', 'empleados', 'usuario', 'acciones'] as const;
  readonly periodoFiltro = signal('');
  readonly rows = signal<readonly AsistenciaImportHistorial[]>([]);
  readonly loading = signal(false);
  readonly validandoImportacionId = signal<number | null>(null);
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

  validarCabeceras(row: AsistenciaImportHistorial): void {
    if (this.validandoImportacionId() != null) {
      return;
    }
    this.validandoImportacionId.set(row.id);
    this.importApi.validarCabeceras(row.id).subscribe({
      next: (resultado) => {
        this.validandoImportacionId.set(null);
        this.snack.open(
          this.mensajeValidacion(row.periodo, resultado.validadas, resultado.observadas),
          'Cerrar',
          { duration: 8000 },
        );
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.validandoImportacionId.set(null);
        this.onHttpSnack(err);
      },
    });
  }

  puedeValidar(row: AsistenciaImportHistorial): boolean {
    return row.estado === 'CONFIRMADA' || row.estado === 'PARCIAL';
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
