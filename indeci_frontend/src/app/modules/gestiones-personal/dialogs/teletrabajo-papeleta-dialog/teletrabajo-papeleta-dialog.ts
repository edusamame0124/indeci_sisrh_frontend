import { Component, Inject, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  DetalleTeletrabajoRequest,
  SolicitudesRrhhService,
  SolicitudRrhh,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

interface ActividadFila {
  actividad: string;
  medioVerificacion: string;
}

interface TeletrabajoPapeletaDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente?: SolicitudRrhh;
}

/**
 * Papeleta de Teletrabajo (Ley N° 31572 / SERVIR).
 * El servidor reporta al finalizar su jornada las actividades del día. La papeleta
 * sigue el flujo estándar de solicitudes: BORRADOR → ENVIADO → APROBADO_JEFE
 * (firma del jefe) → APROBADO_RRHH (recepción URH). Patrón: PermisoComunDialog.
 */
@Component({
  selector: 'app-teletrabajo-papeleta-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './teletrabajo-papeleta-dialog.html',
  styleUrl: './teletrabajo-papeleta-dialog.scss',
})
export class TeletrabajoPapeletaDialog {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<TeletrabajoPapeletaDialog>);

  guardando = signal(false);
  error = signal<string | null>(null);

  /** Fecha del reporte = hoy por defecto; no se permite reportar a futuro. */
  readonly hoy = new Date().toISOString().slice(0, 10);
  fechaReporte = this.hoy;

  /** Modalidad de teletrabajo (Ley N° 31572): PARCIAL (por defecto) o COMPLETA. */
  readonly modalidades = ['PARCIAL', 'COMPLETA'] as const;
  modalidad: 'PARCIAL' | 'COMPLETA' = 'PARCIAL';

  actividades: ActividadFila[] = [{ actividad: '', medioVerificacion: '' }];

  tipoSolicitud!: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente: SolicitudRrhh | null = null;

  tituloDialog = 'Reporte de teletrabajo';

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | TeletrabajoPapeletaDialogData,
  ) {
    if (data && 'tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.solicitudExistente = data.solicitudExistente ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.esEdicion()
      ? `Editar ${this.tipoSolicitud?.nombre ?? 'reporte de teletrabajo'}`
      : (this.tipoSolicitud?.nombre ?? 'Reporte de teletrabajo');

    if (this.solicitudExistente) {
      const s = this.solicitudExistente;
      this.fechaReporte = s.fechaInicio ?? this.hoy;
      this.modalidad = s.modalidadTeletrabajo === 'COMPLETA' ? 'COMPLETA' : 'PARCIAL';

      if (s.detallesTeletrabajo && s.detallesTeletrabajo.length > 0) {
        this.actividades = s.detallesTeletrabajo.map((det) => ({
          actividad: det.actividad ?? '',
          medioVerificacion: det.medioVerificacion ?? '',
        }));
      }
    }
  }

  esEdicion(): boolean {
    return !!this.solicitudExistente?.id;
  }

  agregarActividad(): void {
    this.actividades = [...this.actividades, { actividad: '', medioVerificacion: '' }];
  }

  quitarActividad(indice: number): void {
    if (this.actividades.length <= 1) {
      return;
    }
    this.actividades = this.actividades.filter((_, i) => i !== indice);
  }

  private actividadesValidas(): ActividadFila[] {
    return this.actividades.filter((fila) => fila.actividad.trim().length > 0);
  }

  guardar(): void {
    this.error.set(null);

    if (!this.tipoSolicitud?.id) {
      this.error.set('No se recibió el tipo de papeleta.');
      return;
    }

    if (!this.fechaReporte) {
      this.error.set('Ingrese la fecha del reporte de teletrabajo.');
      return;
    }

    if (this.fechaReporte > this.hoy) {
      this.error.set('No se puede reportar teletrabajo en una fecha futura.');
      return;
    }

    const validas = this.actividadesValidas();

    if (validas.length === 0) {
      this.error.set('Debe registrar al menos una actividad del día.');
      return;
    }

    const detallesTeletrabajo: DetalleTeletrabajoRequest[] = validas.map((fila, indice) => ({
      nroOrden: indice + 1,
      actividad: fila.actividad.trim(),
      medioVerificacion: fila.medioVerificacion.trim() || null,
    }));

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      fechaInicio: this.fechaReporte,
      fechaFin: this.fechaReporte,
      cantidadDias: 1,
      modalidadTeletrabajo: this.modalidad,
      detallesTeletrabajo,
    };

    this.guardando.set(true);

    const obs$ = this.esEdicion()
      ? this.service.editarSolicitud(this.solicitudExistente!.id, payload)
      : this.service.crearSolicitud(payload);

    obs$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);

        const mensaje =
          err?.error?.mensaje ??
          err?.error?.message ??
          (this.esEdicion()
            ? 'No se pudo editar el reporte de teletrabajo.'
            : 'No se pudo registrar el reporte de teletrabajo.');

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
