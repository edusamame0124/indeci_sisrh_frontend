import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { sisrhConfirmDialogConfig, sisrhFormDialogConfig } from '../../../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { EmpleadoJornadaExcepcionApiService } from '../../../../services/empleado-jornada-excepcion-api.service';
import type { EmpleadoJornadaExcepcionRow } from '../../../../models/empleado-jornada-excepcion.model';

import { EmpleadoJornadaExcepcionFormDialogComponent } from './empleado-jornada-excepcion-form-dialog/empleado-jornada-excepcion-form-dialog.component';

const COLUMNAS = [
  'vigencia',
  'periodo',
  'horario',
  'documento',
  'acciones',
] as const;

/**
 * Historial de Horario Especial del empleado (M04 Asistencia — decisión RR.HH.
 * 2026-08-08). Panel exclusivo del Módulo Vinculación: crear/editar/eliminar
 * excepciones individuales de horario, con vigencia y documento de autorización.
 */
@Component({
  selector: 'app-empleado-jornada-excepcion-integrado',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-jornada-excepcion-integrado.component.html',
  styleUrl: './empleado-jornada-excepcion-integrado.component.css',
})
export class EmpleadoJornadaExcepcionIntegradoComponent {
  private readonly api = inject(EmpleadoJornadaExcepcionApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  readonly empleadoId = input.required<number>();
  readonly hasRecord = output<boolean>();

  readonly columnas = COLUMNAS;
  readonly loading = signal(true);
  readonly filas = signal<readonly EmpleadoJornadaExcepcionRow[]>([]);

  constructor() {
    effect(() => {
      const id = this.empleadoId();
      if (id) {
        this.cargar(id);
      }
    });
  }

  private cargar(empleadoId: number): void {
    this.loading.set(true);
    this.api.listarPorEmpleado(empleadoId).subscribe({
      next: (rows) => {
        this.filas.set(rows);
        this.hasRecord.emit(rows.length > 0);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  agregar(): void {
    const ref = this.dialogs.open(
      EmpleadoJornadaExcepcionFormDialogComponent,
      sisrhFormDialogConfig('md', { data: { empleadoId: this.empleadoId() } }),
    );
    ref.afterClosed().subscribe((input) => {
      if (!input) return;
      this.api.registrar(input).subscribe({
        next: () => {
          this.notif.exito('Horario especial registrado correctamente.');
          this.cargar(this.empleadoId());
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
    });
  }

  editar(row: EmpleadoJornadaExcepcionRow): void {
    const ref = this.dialogs.open(
      EmpleadoJornadaExcepcionFormDialogComponent,
      sisrhFormDialogConfig('md', { data: { empleadoId: this.empleadoId(), row } }),
    );
    ref.afterClosed().subscribe((input) => {
      if (!input) return;
      this.api.actualizar(row.id, input).subscribe({
        next: () => {
          this.notif.exito('Horario especial actualizado correctamente.');
          this.cargar(this.empleadoId());
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
    });
  }

  eliminar(row: EmpleadoJornadaExcepcionRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar horario especial',
        message: `Se eliminará el horario especial vigente del ${row.fechaInicio} al ${row.fechaFin}. `
          + 'Desde ese momento, la tardanza volverá a calcularse con el horario del régimen. ¿Continuar?',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok !== true) return;
      this.api.eliminar(row.id).subscribe({
        next: () => {
          this.notif.exito('Horario especial eliminado.');
          this.cargar(this.empleadoId());
        },
        error: (err: HttpErrorResponse) => this.onHttpSnack(err),
      });
    });
  }

  vigenciaLabel(row: EmpleadoJornadaExcepcionRow): string {
    switch (row.estadoVigencia) {
      case 'VIGENTE':
        return 'Vigente';
      case 'FUTURA':
        return 'Futura';
      case 'VENCIDA':
        return 'Vencida';
      default:
        return row.estadoVigencia;
    }
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
    this.notif.error(msg);
  }
}
