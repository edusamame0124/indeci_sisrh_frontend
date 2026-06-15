import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  DocumentoRequeridoDescansoMedico,
  SolicitudesRrhhService,
  TipoDescansoMedico,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

@Component({
  selector: 'app-descanso-medico-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './descanso-medico-dialog.html',
  styleUrl: './descanso-medico-dialog.scss',
})
export class DescansoMedicoDialog implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<DescansoMedicoDialog>);

  tiposDescanso = signal<TipoDescansoMedico[]>([]);
  documentosRequeridos = signal<DocumentoRequeridoDescansoMedico[]>([]);

  cargandoTipos = signal(false);
  cargandoDocumentos = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  tituloDialog = 'Descanso médico';

  tipoDescansoMedicoId: number | null = null;

  fechaInicio = '';
  fechaFin = '';
  cantidadDias: number | null = null;

  nombreMedico = '';
  numeroColegiatura = '';

  motivo = '';
  observacion = '';

  archivosDocumentos = new Map<number, File>();

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public tipoSolicitud: TipoSolicitudRrhh,
  ) {
    this.tituloDialog = this.tipoSolicitud?.nombre ?? 'Descanso médico';
  }

  ngOnInit(): void {
    this.cargarTiposDescanso();
  }

  cargarTiposDescanso(): void {
    this.cargandoTipos.set(true);

    this.service.listarTiposDescansoMedico().subscribe({
      next: (resp) => {
        const activos = (resp.data ?? []).filter((x) => Number(x.activo ?? 1) === 1);
        this.tiposDescanso.set(activos);
        this.cargandoTipos.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo de descanso médico.');
        this.cargandoTipos.set(false);
      },
    });
  }

  onTipoDescansoChange(tipoId: number | null): void {
    this.error.set(null);
    this.documentosRequeridos.set([]);
    this.archivosDocumentos.clear();

    this.tipoDescansoMedicoId = tipoId ? Number(tipoId) : null;

    console.log('Tipo descanso seleccionado:', this.tipoDescansoMedicoId);

    if (!this.tipoDescansoMedicoId) {
      return;
    }

    this.cargandoDocumentos.set(true);

    this.service.listarDocumentosDescansoMedico(this.tipoDescansoMedicoId).subscribe({
      next: (resp) => {
        console.log('Documentos requeridos:', resp);

        const activos = (resp.data ?? []).filter((x) => Number(x.activo ?? 1) === 1);
        this.documentosRequeridos.set(activos);
        this.cargandoDocumentos.set(false);
      },
      error: (err) => {
        console.error('Error cargando documentos requeridos:', err);

        const mensaje =
          err?.error?.mensaje ??
          err?.error?.message ??
          `No se pudo cargar los documentos requeridos. Código HTTP: ${err?.status ?? 'sin estado'}`;

        this.error.set(mensaje);
        this.cargandoDocumentos.set(false);
      },
    });
  }

  documentoId(doc: DocumentoRequeridoDescansoMedico): number | null {
    const id = doc.documentoRequeridoId ?? doc.id;
    return id ? Number(id) : null;
  }

  esDocumentoObligatorio(doc: DocumentoRequeridoDescansoMedico): boolean {
    return doc.obligatorio === true || Number(doc.obligatorio ?? 0) === 1;
  }

  onDocumentoSeleccionado(event: Event, doc: DocumentoRequeridoDescansoMedico): void {
    const id = this.documentoId(doc);

    if (!id) {
      this.error.set('No se pudo identificar el documento requerido.');
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.archivosDocumentos.delete(id);
      return;
    }

    this.archivosDocumentos.set(id, file);
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

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }

  validarDocumentos(): boolean {
    for (const doc of this.documentosRequeridos()) {
      const id = this.documentoId(doc);

      if (!id) {
        this.error.set(`No se pudo identificar el documento: ${doc.nombre}.`);
        return false;
      }

      if (this.esDocumentoObligatorio(doc) && !this.archivosDocumentos.has(id)) {
        this.error.set(`Debe adjuntar el documento: ${doc.nombre}.`);
        return false;
      }
    }

    return true;
  }

  guardar(): void {
    this.error.set(null);

    if (!this.tipoSolicitud?.id) {
      this.error.set('No se recibió el tipo de papeleta.');
      return;
    }

    if (!this.tipoDescansoMedicoId) {
      this.error.set('Seleccione quién expidió el descanso médico.');
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

    if (!this.nombreMedico.trim()) {
      this.error.set('Ingrese el nombre del médico.');
      return;
    }

    if (!this.numeroColegiatura.trim()) {
      this.error.set('Ingrese el número de colegiatura.');
      return;
    }

    if (!this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
      return;
    }

    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set('Debe ingresar una observación.');
      return;
    }

    if (!this.validarDocumentos()) {
      return;
    }

    const documentosSeleccionados = this.documentosRequeridos()
      .map((doc) => {
        const id = this.documentoId(doc);

        if (!id) {
          return null;
        }

        const file = this.archivosDocumentos.get(id);

        if (!file) {
          return null;
        }

        return {
          documentoRequeridoId: id,
          file,
        };
      })
      .filter((x): x is { documentoRequeridoId: number; file: File } => x !== null);

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),

      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: this.cantidadDias,

      motivo: this.motivo.trim(),
      observacion: this.observacion.trim(),

      horaInicio: null,
      horaFin: null,
      cantidadHoras: null,
      lugarComision: null,

      tipoDescansoMedicoId: Number(this.tipoDescansoMedicoId),
      nombreMedico: this.nombreMedico.trim(),
      numeroColegiatura: this.numeroColegiatura.trim(),

      documentosAdjuntos: documentosSeleccionados.map((x) => ({
        documentoRequeridoId: x.documentoRequeridoId,
      })),
    };

    const archivos = documentosSeleccionados.map((x) => x.file);

    this.guardando.set(true);

    this.service.crearSolicitudConDocumentos(payload, archivos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);

        const mensaje =
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar el descanso médico.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
