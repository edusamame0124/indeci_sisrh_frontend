import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  SolicitudesRrhhService,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

@Component({
  selector: 'app-nueva-papeleta-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './../nueva-papeleta-dialog/nueva-papeleta-dialog.html',
  styleUrl: './../nueva-papeleta-dialog/nueva-papeleta-dialog.scss',
})
export class NuevaPapeletaDialogComponent implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<NuevaPapeletaDialogComponent>);

  tipos = signal<TipoSolicitudRrhh[]>([]);
  cargandoTipos = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  tipoSolicitudId: number | null = null;
  fechaInicio = '';
  fechaFin = '';
  cantidadDias: number | null = null;
  horaInicio = '';
  horaFin = '';
  cantidadHoras: number | null = null;
  cantidadHorasTexto = '';
  motivo = '';
  observacion = '';
  lugarComision = '';
  archivoSustento: File | null = null;

  ngOnInit(): void {
    this.cargarTipos();
  }

  cargarTipos(): void {
    this.cargandoTipos.set(true);

    this.service.listarTiposSolicitud().subscribe({
      next: (resp) => {
        const activos = (resp.data ?? []).filter((tipo) => Number(tipo.activo) === 1);

        this.tipos.set(activos);
        this.cargandoTipos.set(false);
        if (this.mostrarHoras()) {
          this.fechaFin = this.fechaInicio;
        }
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo de tipos de solicitud.');
        this.cargandoTipos.set(false);
      },
    });
  }

  tipoSeleccionado(): TipoSolicitudRrhh | null {
    const tipo = this.tipos().find((x) => Number(x.id) === Number(this.tipoSolicitudId)) ?? null;

    console.log('ID seleccionado:', this.tipoSolicitudId);
    console.log('Tipo completo:', tipo);
    console.log('mostrarHoras:', tipo?.mostrarHoras);

    return tipo;
  }
  mostrarHoras(): boolean {
    const tipo = this.tipoSeleccionado();

    const resultado = Number(tipo?.mostrarHoras) === 1;

    console.log('Resultado mostrarHoras():', resultado);

    return resultado;
  }

  calcularDias(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.cantidadDias = null;
      return;
    }

    const inicio = new Date(`${this.fechaInicio}T00:00:00`);
    const fin = new Date(`${this.fechaFin}T00:00:00`);

    const diferenciaMs = fin.getTime() - inicio.getTime();
    const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;

    this.cantidadDias = dias > 0 ? dias : null;

    if (dias <= 0) {
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    this.error.set(null);
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
      this.error.set('La hora fin no puede ser menor o igual que la hora inicio.');
      return;
    }

    const horas = Math.floor(diferenciaMinutos / 60);
    const minutos = diferenciaMinutos % 60;

    this.cantidadHoras = diferenciaMinutos / 60;
    this.cantidadHorasTexto = `${horas} hora(s) ${minutos} minuto(s)`;

    this.error.set(null);
  }

  guardar(): void {
    this.error.set(null);

    if (!this.tipoSolicitudId) {
      this.error.set('Seleccione el tipo de papeleta.');
      return;
    }

    if (!this.fechaInicio || !this.fechaFin) {
      this.error.set('Ingrese la fecha de inicio y la fecha de fin.');
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

    if (this.requiereLugar() && !this.lugarComision.trim()) {
      this.error.set('Debe ingresar el lugar de comisión.');
      return;
    }

    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set('Debe ingresar una observación.');
      return;
    }
    if (this.mostrarHoras()) {
      if (!this.horaInicio || !this.horaFin) {
        this.error.set('Ingrese la hora de inicio y la hora de fin.');
        return;
      }

      this.calcularHoras();

      if (!this.cantidadHoras || this.cantidadHoras <= 0) {
        this.error.set('La hora fin no puede ser menor o igual que la hora inicio.');
        return;
      }

      this.cantidadDias = null;
    } else {
      this.calcularDias();

      if (!this.cantidadDias || this.cantidadDias <= 0) {
        this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
        return;
      }

      this.horaInicio = '';
      this.horaFin = '';
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
    }
    if (!this.requiereSustento()) {
      this.archivoSustento = null;
    }
    if (this.mostrarHoras()) {
      this.fechaFin = this.fechaInicio;
    }
    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitudId),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: this.mostrarHoras() ? null : this.cantidadDias,
      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,
      horaInicio: this.mostrarHoras() ? this.horaInicio : null,
      horaFin: this.mostrarHoras() ? this.horaFin : null,
      cantidadHoras: this.mostrarHoras() ? this.cantidadHoras : null,
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
  onFechaInicioChange(): void {
    if (this.mostrarHoras()) {
      this.fechaFin = this.fechaInicio;
    }
  }
  cerrar(): void {
    this.dialogRef.close(false);
  }
  requiereSustento(): boolean {
    return Number(this.tipoSeleccionado()?.requiereSustento) === 1;
  }

  requiereLugar(): boolean {
    return Number(this.tipoSeleccionado()?.requiereLugar) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSeleccionado()?.requiereObservacion) === 1;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSustento = input.files?.[0] ?? null;
  }
  codigoTipoSolicitud(): string {
    return String(this.tipoSeleccionado()?.codigo ?? '').padStart(3, '0');
  }

  requiereMotivo(): boolean {
    const codigosQueRequierenMotivo = ['007'];

    return codigosQueRequierenMotivo.includes(this.codigoTipoSolicitud());
  }
}
