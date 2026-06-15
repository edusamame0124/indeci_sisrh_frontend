import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  SolicitudesRrhhService,
  TipoLicencia,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

@Component({
  selector: 'app-licencia-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './licencia-dialog.html',
  styleUrl: './licencia-dialog.scss',
})
export class LicenciaDialog implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<LicenciaDialog>);

  tiposLicencia = signal<TipoLicencia[]>([]);
  cargandoTipos = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  tituloDialog = 'Licencia';

  tipoLicenciaId: number | null = null;

  fechaInicio = '';
  fechaFin = '';
  cantidadDias: number | null = null;

  motivo = '';
  observacion = '';

  documento1 = '';
  documento2 = '';
  totalFolios: number | null = null;

  archivoSustento: File | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public tipoSolicitud: TipoSolicitudRrhh,
  ) {
    this.tituloDialog = this.tipoSolicitud?.nombre ?? 'Licencia';
  }

  ngOnInit(): void {
    this.cargarTiposLicencia();
  }

  cargarTiposLicencia(): void {
    this.cargandoTipos.set(true);

    this.service.listarTiposLicencia().subscribe({
      next: (resp) => {
        const activos = (resp.data ?? []).filter((x) => Number(x.activo ?? 1) === 1);
        this.tiposLicencia.set(activos);
        this.cargandoTipos.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo de tipos de licencia.');
        this.cargandoTipos.set(false);
      },
    });
  }

  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
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

    if (!this.tipoLicenciaId) {
      this.error.set('Seleccione el tipo de licencia.');
      return;
    }

    if (!this.fechaInicio || !this.fechaFin) {
      this.error.set('Ingrese la fecha de inicio y la fecha fin.');
      return;
    }

    this.calcularDias();

    if (!this.cantidadDias || this.cantidadDias <= 0) {
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    if (!this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la licencia.');
      return;
    }

    if (!this.documento1.trim()) {
      this.error.set('Ingrese el documento presentado 1.');
      return;
    }

    if (!this.totalFolios || this.totalFolios <= 0) {
      this.error.set('Ingrese el total de folios.');
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
      tipoLicenciaId: Number(this.tipoLicenciaId),

      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: this.cantidadDias,

      motivo: this.motivo.trim(),
      observacion: this.observacion.trim(),

      horaInicio: null,
      horaFin: null,
      cantidadHoras: null,
      lugarComision: null,

      documento1: this.documento1.trim(),
      documento2: this.documento2.trim() || null,
      totalFolios: this.totalFolios,
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
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar la licencia.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}