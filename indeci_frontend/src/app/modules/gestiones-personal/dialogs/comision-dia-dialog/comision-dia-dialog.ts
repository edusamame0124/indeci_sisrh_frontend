import { Component, Inject, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  SolicitudesRrhhService,
  SolicitudRrhh,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

interface ComisionDiaDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente?: SolicitudRrhh;
}

/**
 * Comisión de Servicio por Día (código 'COMISION_DIA', V012_53) — rango de
 * fechas en vez de horas. Componente independiente de PermisoComunDialog
 * (comisión por horas, '006'): no comparten lógica ni se editan entre sí.
 */
@Component({
  selector: 'app-comision-dia-dialog',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './comision-dia-dialog.html',
  styleUrl: './comision-dia-dialog.scss',
})
export class ComisionDiaDialog {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<ComisionDiaDialog>);

  guardando = signal(false);
  error = signal<string | null>(null);

  fechaInicio = '';
  fechaFin = '';
  cantidadDiasTexto = '';

  lugarComision = '';
  motivo = '';
  archivoSustento: File | null = null;
  tituloDialog = 'Comisión de servicio por día';

  tipoSolicitud!: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente: SolicitudRrhh | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | ComisionDiaDialogData,
  ) {
    if (data && 'tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.solicitudExistente = data.solicitudExistente ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.esEdicion()
      ? `Editar ${this.tipoSolicitud?.nombre ?? 'comisión de servicio por día'}`
      : (this.tipoSolicitud?.nombre ?? 'Comisión de servicio por día');

    if (this.solicitudExistente) {
      const s = this.solicitudExistente;
      this.fechaInicio = s.fechaInicio ?? '';
      this.fechaFin = s.fechaFin ?? s.fechaInicio ?? '';
      this.lugarComision = s.lugarComision ?? '';
      this.motivo = s.motivo ?? '';
      this.calcularDias();
    }
  }

  esEdicion(): boolean {
    return !!this.solicitudExistente?.id;
  }

  requiereLugar(): boolean {
    return Number(this.tipoSolicitud?.requiereLugar ?? 0) === 1;
  }

  calcularDias(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.cantidadDiasTexto = '';
      return;
    }

    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    const diffMs = fin.getTime() - inicio.getTime();
    const dias = Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1;

    if (dias <= 0) {
      this.cantidadDiasTexto = '';
      this.error.set('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }

    this.cantidadDiasTexto = `${dias} día(s)`;
    this.error.set(null);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSustento = input.files?.[0] ?? null;
  }

  guardar(): void {
    this.error.set(null);

    if (!this.tipoSolicitud?.id) {
      this.error.set('No se recibió el tipo de papeleta.');
      return;
    }

    if (!this.fechaInicio) {
      this.error.set('Ingrese la fecha de inicio.');
      return;
    }

    if (!this.fechaFin) {
      this.error.set('Ingrese la fecha de fin.');
      return;
    }

    if (this.fechaFin < this.fechaInicio) {
      this.error.set('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }

    if (this.requiereLugar() && !this.lugarComision.trim()) {
      this.error.set('Debe ingresar el lugar de comisión.');
      return;
    }

    this.calcularDias();

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: null,
      motivo: this.motivo.trim() || null,
      observacion: null,
      horaInicio: null,
      horaFin: null,
      cantidadHoras: null,
      lugarComision: this.requiereLugar() ? this.lugarComision.trim() : null,
    };

    this.guardando.set(true);

    const obs$ = this.esEdicion()
      ? this.service.editarSolicitud(this.solicitudExistente!.id, payload)
      : this.service.crearSolicitud(payload, this.archivoSustento);

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
            ? 'No se pudo editar la papeleta.'
            : 'No se pudo registrar la papeleta.');

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
