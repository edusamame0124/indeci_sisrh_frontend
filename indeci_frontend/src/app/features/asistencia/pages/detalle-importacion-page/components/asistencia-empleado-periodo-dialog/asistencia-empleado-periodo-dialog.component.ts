import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { AsistenciaApiService } from '../../../../services/asistencia-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import type { AsistenciaDia, AsistenciaResponse } from '../../../../models/asistencia.model';
import { badgeClass, condicionLabel, fmtMin } from '../../../../utils/asistencia-diaria-display.utils';

export interface AsistenciaEmpleadoPeriodoDialogData {
  readonly empleadoId: number;
  readonly periodo: string;
  readonly dni: string | null;
  readonly nombre: string | null;
}

/**
 * "Ver" de un empleado desde el detalle de importación: muestra su asistencia del período
 * completo (todos los días, incluidas faltas y tardanzas). Solo lectura — lee la cabecera
 * activa vía GET /asistencia/{empleadoId}/{periodo}.
 */
@Component({
  selector: 'app-asistencia-empleado-periodo-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asistencia-empleado-periodo-dialog.component.html',
  styleUrl: './asistencia-empleado-periodo-dialog.component.css',
})
export class AsistenciaEmpleadoPeriodoDialogComponent {
  private readonly api = inject(AsistenciaApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly dialogRef = inject(MatDialogRef<AsistenciaEmpleadoPeriodoDialogComponent>);
  readonly data = inject<AsistenciaEmpleadoPeriodoDialogData>(MAT_DIALOG_DATA);

  readonly cols = ['fecha', 'condicion', 'entrada', 'salida', 'tardanza', 'observacion'] as const;

  readonly asistencia = signal<AsistenciaResponse | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  // Helpers de presentación compartidos.
  readonly condicionLabel = condicionLabel;
  readonly badgeClass = badgeClass;
  readonly fmtMin = fmtMin;

  constructor() {
    this.api.obtener(this.data.empleadoId, this.data.periodo).subscribe({
      next: (resp) => {
        this.asistencia.set(resp);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error;
        this.loadError.set(
          isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
        );
      },
    });
  }

  /** Resalta los días que impactan la planilla (faltas y tardanzas). */
  filaClass(dia: AsistenciaDia): string {
    if (dia.tipoDia === 'FALTA' || dia.tipoDia === 'SANCION_PAD') return 'epd__row epd__row--falta';
    if ((dia.minutosTardanza ?? 0) > 0 || dia.tipoDia === 'TARDANZA') return 'epd__row epd__row--tardanza';
    return 'epd__row';
  }

  fmtFecha(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
