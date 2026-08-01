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

interface LactanciaDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente?: SolicitudRrhh;
}

@Component({
  selector: 'app-lactancia-dialog',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './lactancia-dialog.html',
  styleUrl: './lactancia-dialog.scss',
})
export class LactanciaDialog {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<LactanciaDialog>);

  guardando = signal(false);
  error = signal<string | null>(null);

  fechaInicio = '';
  fechaFin = '';

  fechaNacimientoHijo = '';
  fechaFinPostnatal = '';

  modoLactancia: 'FRACCIONADO' | 'NO_FRACCIONADO' = 'FRACCIONADO';

  minutosIngreso: number | null = null;
  minutosSalida: number | null = null;

  horaInicio = '';
  horaFin = '';
  cantidadHoras: number | null = null;
  cantidadHorasTexto = '';

  motivo = '';
  observacion = '';
  archivoSustento: File | null = null;
  tituloDialog = 'Permiso';

  tipoSolicitud!: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente: SolicitudRrhh | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | LactanciaDialogData,
  ) {
    if (data && 'tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.solicitudExistente = data.solicitudExistente ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.esEdicion()
      ? `Editar ${this.tipoSolicitud?.nombre ?? 'permiso por lactancia'}`
      : (this.tipoSolicitud?.nombre ?? 'Permiso por lactancia');

    if (this.solicitudExistente) {
      const s = this.solicitudExistente;
      this.fechaNacimientoHijo = s.fechaNacimientoHijo ?? '';
      this.fechaFinPostnatal = s.fechaFinPostnatal ?? '';
      this.calcularFechaPrimerAnio();
      this.motivo = s.motivo ?? '';
      this.observacion = s.observacion ?? '';

      const esFraccionada = s.minutosIngreso != null || s.minutosSalida != null;
      this.modoLactancia = esFraccionada ? 'FRACCIONADO' : 'NO_FRACCIONADO';

      if (esFraccionada) {
        this.minutosIngreso = s.minutosIngreso ?? null;
        this.minutosSalida = s.minutosSalida ?? null;
      } else {
        this.horaInicio = s.horaInicio ?? '';
        this.horaFin = s.horaFin ?? '';
        this.calcularHoras();
      }
    }
  }

  esEdicion(): boolean {
    return !!this.solicitudExistente?.id;
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
  usarFraccionado(): boolean {
    return this.modoLactancia === 'FRACCIONADO';
  }

  usarNoFraccionado(): boolean {
    return this.modoLactancia === 'NO_FRACCIONADO';
  }

  onModoLactanciaChange(): void {
    if (this.usarFraccionado()) {
      this.horaInicio = '';
      this.horaFin = '';
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
    }

    if (this.usarNoFraccionado()) {
      this.minutosIngreso = null;
      this.minutosSalida = null;
    }
  }

  calcularFechaPrimerAnio(): void {
    if (!this.fechaNacimientoHijo) {
      this.fechaFin = '';
      return;
    }

    const fecha = new Date(`${this.fechaNacimientoHijo}T00:00:00`);
    fecha.setFullYear(fecha.getFullYear() + 1);

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');

    this.fechaFin = `${yyyy}-${mm}-${dd}`;
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
      this.error.set('La hora hasta no puede ser menor o igual que la hora desde.');
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

    if (!this.fechaNacimientoHijo) {
      this.error.set('Ingrese la fecha de nacimiento del hijo(a).');
      return;
    }

    this.fechaInicio = this.fechaNacimientoHijo;
    this.calcularFechaPrimerAnio();

    if (!this.fechaFin) {
      this.error.set('No se pudo calcular la fecha en que el hijo(a) cumple 1 año.');
      return;
    }


    this.calcularFechaPrimerAnio();

    if (!this.fechaFin) {
      this.error.set('No se pudo calcular la fecha en que el hijo(a) cumple 1 año.');
      return;
    }

    if (this.usarFraccionado()) {
      const ingreso = Number(this.minutosIngreso ?? 0);
      const salida = Number(this.minutosSalida ?? 0);

      if (ingreso + salida <= 0) {
        this.error.set('Ingrese los minutos de ingreso o salida.');
        return;
      }

      if (ingreso + salida > 60) {
        this.error.set('El permiso por lactancia no puede exceder 60 minutos diarios.');
        return;
      }

      this.horaInicio = '';
      this.horaFin = '';
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
    }

    if (this.usarNoFraccionado()) {
      if (!this.horaInicio || !this.horaFin) {
        this.error.set('Ingrese la hora desde y la hora hasta.');
        return;
      }

      this.calcularHoras();

      if (!this.cantidadHoras || this.cantidadHoras <= 0) {
        this.error.set('La hora hasta no puede ser menor o igual que la hora desde.');
        return;
      }

      this.minutosIngreso = null;
      this.minutosSalida = null;
    }
    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
      return;
    }
    if (this.requiereSustento() && !this.esEdicion() && !this.archivoSustento) {
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

      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,

      fechaNacimientoHijo: this.fechaNacimientoHijo,
      fechaFinPostnatal: this.fechaFinPostnatal,

      minutosIngreso: this.usarFraccionado() ? Number(this.minutosIngreso ?? 0) : null,
      minutosSalida: this.usarFraccionado() ? Number(this.minutosSalida ?? 0) : null,

      horaInicio: this.usarNoFraccionado() ? this.horaInicio : null,
      horaFin: this.usarNoFraccionado() ? this.horaFin : null,
      cantidadHoras: this.usarNoFraccionado() ? this.cantidadHoras : null,

      lugarComision: null,
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
          (this.esEdicion() ? 'No se pudo editar la lactancia.' : 'No se pudo registrar la lactancia.');

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
