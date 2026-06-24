import { Component, Inject, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  DetalleCompensacionRequest,
  SolicitudesRrhhService,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

interface DetalleCompensacionForm {
  fechaCompensacion: string;
  horaInicio: string;
  horaFin: string;
  cantidadHoras: number | null;
  cantidadHorasTexto: string;
}

@Component({
  selector: 'app-compensacion-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './compensacion-dialog.html',
  styleUrl: './compensacion-dialog.scss',
})
export class CompensacionDialog {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<CompensacionDialog>);

  guardando = signal(false);
  error = signal<string | null>(null);

  tituloDialog = 'Permiso personal compensable por horas';

  fechaInicio = '';
  fechaFin = '';

  horaInicio = '';
  horaFin = '';
  cantidadHoras: number | null = null;
  cantidadHorasTexto = '';

  motivo = '';
  observacion = '';
  archivoSustento: File | null = null;

  detallesCompensacion: DetalleCompensacionForm[] = [
    {
      fechaCompensacion: '',
      horaInicio: '',
      horaFin: '',
      cantidadHoras: null,
      cantidadHorasTexto: '',
    },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public tipoSolicitud: TipoSolicitudRrhh,
  ) {
    this.tituloDialog = this.tipoSolicitud?.nombre ?? 'Permiso personal compensable por horas';
  }

  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }
  codigoTipoSolicitud(): string {
    return String(this.tipoSolicitud?.codigo ?? '').padStart(3, '0');
  }

  requiereMotivo(): boolean {
    const codigosQueRequierenMotivo = ['007'];

    return codigosQueRequierenMotivo.includes(this.codigoTipoSolicitud());
  }
  onFechaInicioChange(): void {
    this.fechaFin = this.fechaInicio;
  }

  calcularHorasPermiso(): void {
    if (!this.horaInicio || !this.horaFin) {
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
      return;
    }

    const horas = this.calcularDiferenciaHoras(this.horaInicio, this.horaFin);

    if (horas <= 0) {
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
      this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
      return;
    }

    this.cantidadHoras = horas;
    this.cantidadHorasTexto = this.formatearHoras(horas);
    this.error.set(null);
  }

  calcularHorasDetalle(detalle: DetalleCompensacionForm): void {
    if (!detalle.horaInicio || !detalle.horaFin) {
      detalle.cantidadHoras = null;
      detalle.cantidadHorasTexto = '';
      return;
    }

    const horas = this.calcularDiferenciaHoras(detalle.horaInicio, detalle.horaFin);

    if (horas <= 0) {
      detalle.cantidadHoras = null;
      detalle.cantidadHorasTexto = '';
      this.error.set(
        'En la compensación, la hora fin no puede ser menor o igual que la hora inicio.',
      );
      return;
    }

    detalle.cantidadHoras = horas;
    detalle.cantidadHorasTexto = this.formatearHoras(horas);
    this.error.set(null);
  }

  calcularDiferenciaHoras(horaInicio: string, horaFin: string): number {
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);

    const inicioMinutos = hi * 60 + mi;
    const finMinutos = hf * 60 + mf;
    const diferenciaMinutos = finMinutos - inicioMinutos;

    return diferenciaMinutos / 60;
  }

  formatearHoras(valor: number): string {
    const totalMinutos = Math.round(valor * 60);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return `${horas} hora(s) ${minutos} minuto(s)`;
  }

  totalHorasCompensadas(): number {
    return this.detallesCompensacion.reduce(
      (total, item) => total + Number(item.cantidadHoras ?? 0),
      0,
    );
  }

  totalHorasCompensadasTexto(): string {
    return this.formatearHoras(this.totalHorasCompensadas());
  }

  agregarCompensacion(): void {
    this.detallesCompensacion.push({
      fechaCompensacion: '',
      horaInicio: '',
      horaFin: '',
      cantidadHoras: null,
      cantidadHorasTexto: '',
    });
  }

  quitarCompensacion(index: number): void {
    if (this.detallesCompensacion.length === 1) {
      this.error.set('Debe registrar al menos una compensación.');
      return;
    }

    this.detallesCompensacion.splice(index, 1);
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

    this.calcularHorasPermiso();

    if (!this.cantidadHoras || this.cantidadHoras <= 0) {
      this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
      return;
    }

    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
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

    for (const detalle of this.detallesCompensacion) {
      if (!detalle.fechaCompensacion) {
        this.error.set('Ingrese la fecha de compensación.');
        return;
      }

      if (!detalle.horaInicio || !detalle.horaFin) {
        this.error.set('Ingrese la hora inicio y hora fin de la compensación.');
        return;
      }

      this.calcularHorasDetalle(detalle);

      if (!detalle.cantidadHoras || detalle.cantidadHoras <= 0) {
        this.error.set('Complete correctamente las horas de compensación.');
        return;
      }
    }

    const totalCompensado = this.totalHorasCompensadas();

    if (Math.abs(totalCompensado - this.cantidadHoras) > 0.01) {
      this.error.set(
        `El total compensado (${this.formatearHoras(totalCompensado)}) debe ser igual al permiso solicitado (${this.formatearHoras(this.cantidadHoras)}).`,
      );
      return;
    }

    if (!this.requiereSustento()) {
      this.archivoSustento = null;
    }

    const detalles: DetalleCompensacionRequest[] = this.detallesCompensacion.map((item) => ({
      fechaCompensacion: item.fechaCompensacion,
      horaInicio: item.horaInicio,
      horaFin: item.horaFin,
      cantidadHoras: Number(item.cantidadHoras),
    }));

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),

      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: null,

      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,

      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      cantidadHoras: this.cantidadHoras,

      lugarComision: null,
      detallesCompensacion: detalles,
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
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar la compensación.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
