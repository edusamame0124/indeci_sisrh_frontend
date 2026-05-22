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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { PersonaApiService } from '../../services/persona-api.service';
import { VacacionSaldoApiService } from '../../services/vacacion-saldo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type { VacacionSaldoRow } from '../../models/beneficio.model';

/**
 * Mantenimiento del saldo de vacaciones del empleado (Spec 011 / B5).
 * Selector de empleado + registro/actualización del saldo por año (UPSERT).
 */
@Component({
  selector: 'app-vacacion-mantenimiento-page',
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
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vacacion-mantenimiento-page.component.html',
  styleUrl: './vacacion-mantenimiento-page.component.css',
})
export class VacacionMantenimientoPageComponent implements OnInit {
  private readonly personaApi = inject(PersonaApiService);
  private readonly vacacionApi = inject(VacacionSaldoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['anio', 'ganados', 'gozados', 'saldo', 'acciones'] as const;

  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly empleadoSeleccionado = signal<number | null>(null);
  readonly vacaciones = signal<readonly VacacionSaldoRow[]>([]);

  readonly loading = signal(true);
  readonly datosLoading = signal(false);
  readonly guardando = signal(false);
  readonly mostrarForm = signal(false);

  // Campos del formulario (alta o edición — el backend hace UPSERT por año).
  readonly fAnio = signal<number | null>(null);
  readonly fGanados = signal<number | null>(null);
  readonly fGozados = signal<number | null>(null);
  readonly fObservacion = signal('');

  readonly empleados = computed(() =>
    this.personas()
      .filter((p) => p.empleadoId != null)
      .slice()
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
  );

  fmtDias(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    this.cargarPersonas();
  }

  onEmpleadoChange(empleadoId: number): void {
    this.empleadoSeleccionado.set(empleadoId);
    this.mostrarForm.set(false);
    this.cargarVacaciones(empleadoId);
  }

  /** Abre el formulario para un año nuevo. */
  abrirForm(): void {
    this.fAnio.set(new Date().getFullYear());
    this.fGanados.set(30);
    this.fGozados.set(0);
    this.fObservacion.set('');
    this.mostrarForm.set(true);
  }

  /** Abre el formulario con los datos de un año existente para editarlo. */
  editar(row: VacacionSaldoRow): void {
    this.fAnio.set(row.anio);
    this.fGanados.set(row.diasGanados);
    this.fGozados.set(row.diasGozados);
    this.fObservacion.set(row.observacion ?? '');
    this.mostrarForm.set(true);
  }

  cancelarForm(): void {
    this.mostrarForm.set(false);
  }

  guardar(): void {
    const empleadoId = this.empleadoSeleccionado();
    if (empleadoId == null) return;
    const anio = this.fAnio();
    const diasGanados = this.fGanados();
    const diasGozados = this.fGozados();

    if (anio == null || anio < 2000
        || diasGanados == null || diasGanados < 0
        || diasGozados == null || diasGozados < 0) {
      this.snack.open('Completa año y días (ganados/gozados no negativos).', 'Cerrar', {
        duration: 5000,
      });
      return;
    }

    this.guardando.set(true);
    this.vacacionApi
      .guardar({
        empleadoId,
        anio,
        diasGanados,
        diasGozados,
        observacion: this.fObservacion().trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarForm.set(false);
          this.snack.open('Saldo de vacaciones guardado.', 'Cerrar', { duration: 4000 });
          this.cargarVacaciones(empleadoId);
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.onHttpSnack(err);
        },
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

  private cargarVacaciones(empleadoId: number): void {
    this.datosLoading.set(true);
    this.vacacionApi.listarPorEmpleado(empleadoId).subscribe({
      next: (rows) => {
        this.vacaciones.set(rows);
        this.datosLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.datosLoading.set(false);
        this.vacaciones.set([]);
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
