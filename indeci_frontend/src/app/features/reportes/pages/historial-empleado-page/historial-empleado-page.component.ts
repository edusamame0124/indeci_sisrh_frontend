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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';

/**
 * Reporte — Historial de empleado (Spec 011 / B6).
 * Selector de empleado + sus movimientos de planilla en todos los períodos.
 */
@Component({
  selector: 'app-historial-empleado-page',
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
  templateUrl: './historial-empleado-page.component.html',
  styleUrl: './historial-empleado-page.component.css',
})
export class HistorialEmpleadoPageComponent implements OnInit {
  private readonly personaApi = inject(PersonaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['periodo', 'ingresos', 'descuentos', 'neto', 'boleta'] as const;

  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly empleadoSeleccionado = signal<number | null>(null);
  readonly movimientos = signal<readonly MovimientoPlanillaRow[]>([]);

  readonly loading = signal(true);
  readonly datosLoading = signal(false);

  readonly empleados = computed(() =>
    this.personas()
      .filter((p) => p.empleadoId != null)
      .slice()
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
  );

  /** Movimientos del período más reciente al más antiguo. */
  readonly historial = computed(() =>
    this.movimientos().slice().sort((a, b) => b.periodo.localeCompare(a.periodo)),
  );

  /** Total neto acumulado del historial. */
  readonly totalNeto = computed(() =>
    this.historial().reduce((s, m) => s + (m.netoPagar ?? 0), 0),
  );

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    this.cargarPersonas();
  }

  onEmpleadoChange(empleadoId: number): void {
    this.empleadoSeleccionado.set(empleadoId);
    this.cargarHistorial(empleadoId);
  }

  private cargarPersonas(): void {
    this.loading.set(true);
    this.personaApi.listar().subscribe({
      next: (rows) => {
        this.personas.set(rows);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarHistorial(empleadoId: number): void {
    this.datosLoading.set(true);
    this.movimientoApi.listarPorEmpleado(empleadoId).subscribe({
      next: (rows) => {
        this.movimientos.set(rows);
        this.datosLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.datosLoading.set(false);
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
