import { Component, Inject, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  SolicitudesRrhhService,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

interface PermisoComunDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
}

@Component({
  selector: 'app-permiso-comun-dialog',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './permiso-comun-dialog.html',
  styleUrl: './permiso-comun-dialog.scss',
})
export class PermisoComunDialog {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<PermisoComunDialog>);

  guardando = signal(false);
  error = signal<string | null>(null);

  fechaInicio = '';
  fechaFin = '';

  horaInicio = '';
  horaFin = '';
  cantidadHoras: number | null = null;
  cantidadHorasTexto = '';

  motivo = '';
  observacion = '';
  lugarComision = '';
  archivoSustento: File | null = null;
  tituloDialog = 'Permiso';
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public tipoSolicitud: TipoSolicitudRrhh,
  ) {
    this.tituloDialog = this.tipoSolicitud?.nombre ?? 'Permiso';
  }

  /**get tipoSolicitud(): TipoSolicitudRrhh {
    return this.data.tipoSolicitud;
  }

  get tituloDialog(): string {
    return this.tipoSolicitud?.nombre ?? 'Permiso';
  }*/

  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }

  requiereLugar(): boolean {
    return Number(this.tipoSolicitud?.requiereLugar ?? 0) === 1;
  }

  onFechaInicioChange(): void {
    this.fechaFin = this.fechaInicio;
  }

  calcularHoras(): void {
    if (!this.horaInicio || !this.horaFin) {
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
      return;
    }

    const [hi, mi] = this.horaInicio.split(':').map(Number);
    const [hf, mf] = this.horaFin.split(':').map(Number);

    const inicioMinutos = hi * 60 + mi;
    const finMinutos = hf * 60 + mf;
    const diferenciaMinutos = finMinutos - inicioMinutos;

    if (diferenciaMinutos <= 0) {
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
      this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
      return;
    }

    const horas = Math.floor(diferenciaMinutos / 60);
    const minutos = diferenciaMinutos % 60;

    this.cantidadHoras = diferenciaMinutos / 60;
    this.cantidadHorasTexto = `${horas} hora(s) ${minutos} minuto(s)`;

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

    this.fechaFin = this.fechaInicio;

    if (!this.fechaInicio) {
      this.error.set('Ingrese la fecha del permiso.');
      return;
    }

    if (!this.horaInicio || !this.horaFin) {
      this.error.set('Ingrese la hora de salida y la hora de ingreso.');
      return;
    }

    this.calcularHoras();

    if (!this.cantidadHoras || this.cantidadHoras <= 0) {
      this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
      return;
    }

    if (!this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
      return;
    }

    if (this.requiereLugar() && !this.lugarComision.trim()) {
      this.error.set('Debe ingresar el lugar de comisión.');
      return;
    }

    if (this.requiereSustento() && !this.archivoSustento) {
      this.error.set('Debe adjuntar el documento de sustento.');
      return;
    }

    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set('Debe ingresar una observación.');
      return;
    }

    if (!this.requiereSustento()) {
      this.archivoSustento = null;
    }

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: null,
      motivo: this.motivo.trim(),
      observacion: this.observacion.trim(),
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      cantidadHoras: this.cantidadHoras,
      lugarComision: this.requiereLugar() ? this.lugarComision.trim() : null,
    };

    this.guardando.set(true);

    this.service.crearSolicitud(payload, this.archivoSustento).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);

        const mensaje =
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar la papeleta.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
