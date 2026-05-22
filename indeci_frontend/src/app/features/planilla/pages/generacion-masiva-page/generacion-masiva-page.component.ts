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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../services/movimiento-planilla-api.service';
import { GeneradorPlanillaApiService } from '../../services/generador-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';
import type { GeneracionMasivaResultado } from '../../models/generacion-masiva.model';

type FaseGeneracion = 'idle' | 'generando' | 'completado';

/**
 * Generación masiva de planilla (Spec 009 / T153, Spec 011 / C2).
 * - Selector de periodos ABIERTOS (la generación en CERRADO la rechaza backend).
 * - Confirmación previa con `ConfirmDialogComponent`.
 * - `MatProgressBar` indeterminado mientras corre + `aria-live` anuncio.
 * - Spec 011 / C2 (BKD-001): el backend devuelve `{ total, exitosos, fallidos[] }`;
 *   la pantalla muestra el conteo y la tabla de fallidos con su motivo.
 */
@Component({
  selector: 'app-generacion-masiva-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './generacion-masiva-page.component.html',
  styleUrl: './generacion-masiva-page.component.css',
})
export class GeneracionMasivaPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly generadorApi = inject(GeneradorPlanillaApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['empleadoId', 'totalIngresos', 'totalDescuentos', 'netoPagar', 'estado'] as const;
  readonly columnsFallidos = ['empleadoId', 'razon'] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly loading = signal(true);
  readonly fase = signal<FaseGeneracion>('idle');
  readonly movimientosPost = signal<readonly MovimientoPlanillaRow[]>([]);
  /** Resultado de la última generación masiva (Spec 011 / C2). */
  readonly resultado = signal<GeneracionMasivaResultado | null>(null);

  readonly periodosAbiertos = computed(() => this.periodos().filter((p) => p.estado === 'ABIERTO'));

  readonly canGenerar = computed(
    () => this.fase() !== 'generando' && this.periodoSeleccionado() !== null,
  );

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.fase.set('idle');
    this.movimientosPost.set([]);
    this.resultado.set(null);
  }

  confirmarGeneracion(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo || !this.canGenerar()) return;

    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: `Generar planilla masiva — ${periodo}`,
        message: `Se ejecutará el cálculo de planilla para todos los empleados activos en el periodo ${periodo}. La operación puede tomar varios segundos. ¿Continuar?`,
        confirmLabel: 'Generar planilla',
        cancelLabel: 'Cancelar',
        severity: 'info',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.ejecutar(periodo);
    });
  }

  private cargarPeriodos(): void {
    this.loading.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const ordenados = [...rows].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        const inicial = ordenados.find((p) => p.estado === 'ABIERTO');
        if (inicial) {
          this.periodoSeleccionado.set(inicial.periodo);
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  /** Disparador real de la generación (uso post-confirmación). Público como test seam. */
  ejecutar(periodo: string): void {
    this.fase.set('generando');
    this.movimientosPost.set([]);
    this.resultado.set(null);
    this.generadorApi.generarMasivo(periodo).subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.snack.open(
          `Generación completada: ${resultado.exitosos} de ${resultado.total} exitoso(s)` +
            (resultado.fallidos.length > 0 ? `, ${resultado.fallidos.length} con error.` : '.'),
          'Cerrar',
          { duration: 6000 },
        );
        this.movimientoApi.listarPeriodo(periodo).subscribe({
          next: (rows) => {
            this.movimientosPost.set(rows);
            this.fase.set('completado');
          },
          error: (err: HttpErrorResponse) => {
            this.fase.set('completado');
            this.onHttpSnack(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.fase.set('idle');
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
