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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PersonaApiService } from '../../services/persona-api.service';
import { PrestamoApiService } from '../../services/prestamo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type { PrestamoRow } from '../../models/beneficio.model';

/**
 * Mantenimiento de préstamos del empleado (Spec 011 / B5).
 * Selector de empleado + alta de préstamos + registro de pago de cuotas.
 */
@Component({
  selector: 'app-prestamo-mantenimiento-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prestamo-mantenimiento-page.component.html',
  styleUrl: './prestamo-mantenimiento-page.component.css',
})
export class PrestamoMantenimientoPageComponent implements OnInit {
  private readonly personaApi = inject(PersonaApiService);
  private readonly prestamoApi = inject(PrestamoApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'descripcion',
    'cuotas',
    'cuotaMensual',
    'saldo',
    'estado',
    'acciones',
  ] as const;

  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly empleadoSeleccionado = signal<number | null>(null);
  readonly prestamos = signal<readonly PrestamoRow[]>([]);

  readonly loading = signal(true);
  readonly datosLoading = signal(false);
  readonly guardando = signal(false);
  readonly mostrarForm = signal(false);

  // Campos del formulario de alta.
  readonly fDescripcion = signal('');
  readonly fMontoTotal = signal<number | null>(null);
  readonly fNumeroCuotas = signal<number | null>(null);
  readonly fCuotaMensual = signal<number | null>(null);

  readonly empleados = computed(() =>
    this.personas()
      .filter((p) => p.empleadoId != null)
      .slice()
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
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
    this.mostrarForm.set(false);
    this.cargarPrestamos(empleadoId);
  }

  abrirForm(): void {
    this.fDescripcion.set('');
    this.fMontoTotal.set(null);
    this.fNumeroCuotas.set(null);
    this.fCuotaMensual.set(null);
    this.mostrarForm.set(true);
  }

  cancelarForm(): void {
    this.mostrarForm.set(false);
  }

  registrar(): void {
    const empleadoId = this.empleadoSeleccionado();
    if (empleadoId == null) return;
    const descripcion = this.fDescripcion().trim();
    const montoTotal = this.fMontoTotal();
    const numeroCuotas = this.fNumeroCuotas();
    const cuotaMensual = this.fCuotaMensual();

    if (descripcion.length === 0 || montoTotal == null || montoTotal < 0
        || numeroCuotas == null || numeroCuotas <= 0
        || cuotaMensual == null || cuotaMensual < 0) {
      this.snack.open('Completa descripción, monto, cuotas y cuota mensual.', 'Cerrar', {
        duration: 5000,
      });
      return;
    }

    this.guardando.set(true);
    this.prestamoApi
      .registrar({ empleadoId, descripcion, montoTotal, numeroCuotas, cuotaMensual })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarForm.set(false);
          this.snack.open('Préstamo registrado.', 'Cerrar', { duration: 4000 });
          this.cargarPrestamos(empleadoId);
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.onHttpSnack(err);
        },
      });
  }

  registrarPago(prestamo: PrestamoRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Registrar pago de cuota',
        message: `Se registrará una cuota pagada del préstamo "${prestamo.descripcion}" `
          + `(${prestamo.cuotasPagadas + 1}/${prestamo.numeroCuotas}). ¿Continuar?`,
        confirmLabel: 'Registrar pago',
        cancelLabel: 'Cancelar',
        severity: 'info',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok !== true) return;
      this.prestamoApi.registrarPago(prestamo.id).subscribe({
        next: () => {
          this.snack.open('Pago de cuota registrado.', 'Cerrar', { duration: 4000 });
          const empleadoId = this.empleadoSeleccionado();
          if (empleadoId != null) this.cargarPrestamos(empleadoId);
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
    });
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

  private cargarPrestamos(empleadoId: number): void {
    this.datosLoading.set(true);
    this.prestamoApi.listarPorEmpleado(empleadoId).subscribe({
      next: (rows) => {
        this.prestamos.set(rows);
        this.datosLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.datosLoading.set(false);
        this.prestamos.set([]);
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
