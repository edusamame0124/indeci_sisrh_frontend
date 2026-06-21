import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoSaludEpsApiService } from '../../../../services/empleado-salud-eps-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import type { EmpleadoSaludEpsRow } from '../../../../models/empleado-salud-eps.model';
import {
  SaludEpsAnularDialogComponent,
  type SaludEpsAnularDialogData,
} from '../salud-eps-anular-dialog/salud-eps-anular-dialog.component';

@Component({
  selector: 'app-salud-eps-historial-tab',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule, MatButtonModule,
    MatIconModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salud-eps-historial-tab.component.html',
  styleUrl: './salud-eps-historial-tab.component.css',
})
export class SaludEpsHistorialTabComponent {
  @Input({ required: true }) empleadoId!: number;
  @Input() rows: readonly EmpleadoSaludEpsRow[] = [];
  @Output() refrescar = new EventEmitter<void>();

  private readonly api    = inject(EmpleadoSaludEpsApiService);
  private readonly notif  = inject(NotificacionService);
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly columns = ['tipoCobertura', 'epsNombre', 'fechaInicio', 'fechaFin', 'estado', 'creadoPor', 'creadoEn', 'acciones'] as const;

  readonly actionLoading = signal<number | null>(null);

  readonly trackByRow = (_: number, r: EmpleadoSaludEpsRow): number => r.id;

  tipoLabel(tipo: string): string {
    return tipo === 'ESSALUD' ? 'Solo EsSalud (9%)' : 'EsSalud + EPS';
  }

  estadoBadge(estado: string): string {
    switch (estado) {
      case 'ACTIVO':   return 'badge--activo';
      case 'CERRADO':  return 'badge--cerrado';
      case 'INACTIVO': return 'badge--inactivo';
      case 'ANULADO':  return 'badge--anulado';
      default:         return '';
    }
  }

  canCerrar(row: EmpleadoSaludEpsRow): boolean  { return row.estado === 'ACTIVO'; }
  canAnular(row: EmpleadoSaludEpsRow): boolean   { return row.estado !== 'ANULADO'; }

  cerrar(row: EmpleadoSaludEpsRow): void {
    if (!this.canCerrar(row)) return;
    this.actionLoading.set(row.id);
    this.api.cerrar(this.empleadoId, row.id).subscribe({
      next: () => {
        this.notif.exito('Cobertura cerrada correctamente.');
        this.actionLoading.set(null);
        this.refrescar.emit();
      },
      error: (err: any) => {
        this.snack.open(err?.error?.message ?? 'Error al cerrar la cobertura.', 'Cerrar', { duration: 7000 });
        this.actionLoading.set(null);
      },
    });
  }

  abrirAnular(row: EmpleadoSaludEpsRow): void {
    const data: SaludEpsAnularDialogData = {
      empleadoId: this.empleadoId,
      coberturaId: row.id,
      tipo: row.tipoCobertura,
    };
    this.dialog.open(SaludEpsAnularDialogComponent, { data, width: '540px', maxWidth: '95vw', maxHeight: '90vh' })
      .afterClosed().subscribe((ok) => { if (ok) this.refrescar.emit(); });
  }
}
