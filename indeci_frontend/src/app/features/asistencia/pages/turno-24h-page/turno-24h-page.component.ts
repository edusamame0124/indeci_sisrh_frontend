import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { EmpleadoTurno24hApiService } from '../../services/empleado-turno-24h-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type {
  EmpleadoTurno24hInput,
  EmpleadoTurno24hRow,
} from '../../models/empleado-turno-24h.model';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { readApiErrorMessage } from '../../../../core/models/error-response.model';
import {
  Turno24hFormDialogComponent,
  type Turno24hFormDialogData,
} from './turno-24h-form-dialog/turno-24h-form-dialog.component';

/**
 * Empleados con turno continuo 24h (guardia COEN) vigente — pestaña propia de Gestión de
 * Asistencia. RIS INDECI 2026-08-09: alimenta a Turno24hReconciliadorService, que reclasifica
 * automáticamente las guardias huérfanas (Falta: solo ingreso) de estos empleados como
 * Laboral + Descanso post-guardia en cada import nuevo.
 */
@Component({
  selector: 'app-turno-24h-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  templateUrl: './turno-24h-page.component.html',
  styleUrl: './turno-24h-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Turno24hPageComponent implements OnInit {
  private readonly api = inject(EmpleadoTurno24hApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly dialog = inject(MatDialog);
  private readonly errorMessage = inject(ErrorMessageService);
  private readonly notificacion = inject(NotificacionService);

  readonly filas = signal<readonly EmpleadoTurno24hRow[]>([]);
  readonly empleados = signal<readonly PersonaEmpleado[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly columnas = ['empleado', 'vigencia', 'fechaInicio', 'fechaFin', 'documento', 'motivo', 'acciones'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      filas: this.api.listarTodosVigentes(),
      empleados: this.personaApi.listar(),
    }).subscribe({
      next: ({ filas, empleados }) => {
        this.filas.set(filas);
        this.empleados.set(empleados);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.mensajeError(err, 'No se pudo cargar la lista de turnos 24h.'));
        this.cargando.set(false);
      },
    });
  }

  nombreDe(empleadoId: number): string {
    const emp = this.empleados().find((e) => e.empleadoId === empleadoId);
    return emp ? `${emp.nombreCompleto} — DNI ${emp.dni ?? '—'}` : `Empleado #${empleadoId}`;
  }

  nuevo(): void {
    const data: Turno24hFormDialogData = { empleados: this.empleados() };
    this.dialog
      .open(Turno24hFormDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((input: EmpleadoTurno24hInput | null) => {
        if (!input) return;
        this.api.registrar(input).subscribe({
          next: () => {
            this.notificacion.exito('Turno 24h registrado correctamente.');
            this.cargar();
          },
          error: (err: HttpErrorResponse) => {
            this.error.set(this.mensajeError(err, 'No se pudo registrar el turno 24h.'));
          },
        });
      });
  }

  editar(row: EmpleadoTurno24hRow): void {
    const data: Turno24hFormDialogData = { empleados: this.empleados(), row };
    this.dialog
      .open(Turno24hFormDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((input: EmpleadoTurno24hInput | null) => {
        if (!input) return;
        this.api.actualizar(row.id, input).subscribe({
          next: () => {
            this.notificacion.exito('Turno 24h actualizado correctamente.');
            this.cargar();
          },
          error: (err: HttpErrorResponse) => {
            this.error.set(this.mensajeError(err, 'No se pudo actualizar el turno 24h.'));
          },
        });
      });
  }

  eliminar(row: EmpleadoTurno24hRow): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar turno 24h',
      message: `¿Confirma que desea eliminar el turno 24h de ${this.nombreDe(row.empleadoId)}? Esta acción no reclasificará los días ya reconciliados.`,
      severity: 'danger',
      confirmLabel: 'Eliminar',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmado: boolean) => {
        if (!confirmado) return;
        this.api.eliminar(row.id).subscribe({
          next: () => {
            this.notificacion.exito('Turno 24h eliminado.');
            this.cargar();
          },
          error: (err: HttpErrorResponse) => {
            this.error.set(this.mensajeError(err, 'No se pudo eliminar el turno 24h.'));
          },
        });
      });
  }

  private mensajeError(err: HttpErrorResponse, fallback: string): string {
    const raw = readApiErrorMessage(err.error);
    return raw ? this.errorMessage.translate(raw) : fallback;
  }

  claseVigencia(estado: string): string {
    switch (estado) {
      case 'VIGENTE':
        return 't24-page__badge--vigente';
      case 'FUTURA':
        return 't24-page__badge--futura';
      default:
        return 't24-page__badge--vencida';
    }
  }
}
