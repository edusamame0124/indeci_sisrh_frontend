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

interface PermisoComunDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente?: SolicitudRrhh;
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

  // Omisión de Registro de Asistencia (código 004): la regla de negocio es entrada XOR salida
  // (una sola marca faltante, no un rango con duración) — ver PapeletaJustificacionResolver.
  tipoOmision: 'INGRESO' | 'SALIDA' | '' = '';
  horaOmision = '';

  motivo = '';
  observacion = '';
  lugarComision = '';
  archivoSustento: File | null = null;
  tituloDialog = 'Permiso';

  tipoSolicitud!: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente: SolicitudRrhh | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | PermisoComunDialogData,
  ) {
    if (data && 'tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.solicitudExistente = data.solicitudExistente ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.esEdicion()
      ? `Editar ${this.tipoSolicitud?.nombre ?? 'permiso'}`
      : (this.tipoSolicitud?.nombre ?? 'Permiso');

    if (this.solicitudExistente) {
      const s = this.solicitudExistente;
      this.fechaInicio = s.fechaInicio ?? '';
      this.fechaFin = s.fechaFin ?? s.fechaInicio ?? '';
      this.horaInicio = s.horaInicio ?? '';
      this.horaFin = s.horaFin ?? '';
      this.motivo = s.motivo ?? '';
      this.observacion = s.observacion ?? '';
      this.lugarComision = s.lugarComision ?? '';

      if (this.esOmision()) {
        // Legado: papeletas creadas antes de este ajuste guardan ambas horas → no se puede
        // inferir el tipo con certeza; se deja en blanco para que el usuario lo reconfirme.
        if (s.horaInicio && !s.horaFin) {
          this.tipoOmision = 'SALIDA';
          this.horaOmision = s.horaInicio;
        } else if (s.horaFin && !s.horaInicio) {
          this.tipoOmision = 'INGRESO';
          this.horaOmision = s.horaFin;
        }
      } else {
        this.calcularHoras();
      }
    }
  }

  esEdicion(): boolean {
    return !!this.solicitudExistente?.id;
  }

  codigoTipoSolicitud(): string {
    return String(this.tipoSolicitud?.codigo ?? '').padStart(3, '0');
  }

  /** Código 004 — Permiso de Justificación de Omisión de Registro de Asistencia. */
  esOmision(): boolean {
    return this.codigoTipoSolicitud() === '004';
  }

  onTipoOmisionChange(): void {
    this.horaOmision = '';
    this.error.set(null);
  }

  requiereMotivo(): boolean {
    const codigosQueRequierenMotivo = ['007'];

    return codigosQueRequierenMotivo.includes(this.codigoTipoSolicitud());
  }

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

    if (this.esOmision()) {
      // Omisión de marcación = una sola marca faltante (entrada XOR salida), no una ventana de
      // tiempo: no aplica "cantidad de horas" ni el par hora-salida/hora-ingreso genérico.
      if (!this.tipoOmision) {
        this.error.set('Seleccione si la omisión fue de Ingreso o de Salida.');
        return;
      }

      if (!this.horaOmision) {
        this.error.set(`Ingrese la hora de ${this.tipoOmision === 'INGRESO' ? 'ingreso' : 'salida'}.`);
        return;
      }

      this.cantidadHoras = null;
    } else {
      if (!this.horaInicio || !this.horaFin) {
        this.error.set('Ingrese la hora de salida y la hora de ingreso.');
        return;
      }

      this.calcularHoras();

      if (!this.cantidadHoras || this.cantidadHoras <= 0) {
        this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
        return;
      }
    }

    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
      return;
    }

    if (this.requiereLugar() && !this.lugarComision.trim()) {
      this.error.set('Debe ingresar el lugar de comisión.');
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

    // Mapeo al esquema existente (sin migración): Ingreso → horaFin, Salida → horaInicio, igual
    // a las etiquetas ya usadas por este mismo diálogo para el resto de permisos por horas.
    const horaInicioPayload = this.esOmision()
      ? this.tipoOmision === 'SALIDA'
        ? this.horaOmision
        : null
      : this.horaInicio;
    const horaFinPayload = this.esOmision()
      ? this.tipoOmision === 'INGRESO'
        ? this.horaOmision
        : null
      : this.horaFin;

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: null,
      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,
      horaInicio: horaInicioPayload,
      horaFin: horaFinPayload,
      cantidadHoras: this.cantidadHoras,
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
