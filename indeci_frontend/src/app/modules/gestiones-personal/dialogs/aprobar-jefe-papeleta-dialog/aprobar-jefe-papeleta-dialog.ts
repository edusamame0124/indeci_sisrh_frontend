import { Component, Inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  SolicitudRrhh,
  SolicitudesRrhhService,
} from '../../services/solicitudes-rrhh';

@Component({
  selector: 'app-aprobar-jefe-papeleta-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './aprobar-jefe-papeleta-dialog.html',
  styleUrl: './aprobar-jefe-papeleta-dialog.scss',
})
export class AprobarJefePapeletaDialogComponent {
  archivo: File | null = null;
  observacion = '';

  procesando = signal(false);
  error = signal<string | null>(null);

  constructor(
    private readonly service: SolicitudesRrhhService,
    private readonly dialogRef: MatDialogRef<AprobarJefePapeletaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly solicitud: SolicitudRrhh,
  ) {}

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
  }

  /** SPEC_VACACIONES F9.1-bis — descarga la papeleta FIRMADA por el empleado (etapa EMPLEADO). */
  descargarPapeleta(): void {
    this.descargarPorEtapa('EMPLEADO', 'No existe la papeleta firmada por el empleado.', true);
  }

  /** SPEC_VACACIONES F9.1-bis — descarga el SUSTENTO subido por el empleado (etapa SUSTENTO). */
  descargarSustento(): void {
    this.descargarPorEtapa('SUSTENTO', 'No existe documento de sustento adjunto.', false);
  }

  /**
   * Descarga el documento ya almacenado (rápido, sin regenerar) de la etapa indicada.
   * @param conFallback si true y no hay doc de esa etapa, usa el de mayor versión.
   */
  private descargarPorEtapa(etapa: string, msgVacio: string, conFallback: boolean): void {
    this.service.listarDocumentosSolicitud(this.solicitud.id).subscribe({
      next: (resp) => {
        const docs = resp.data ?? [];
        const porVersion = (a: { versionDoc: number }, b: { versionDoc: number }) =>
          Number(b.versionDoc) - Number(a.versionDoc);
        const doc =
          docs.filter((d) => d.etapa === etapa).slice().sort(porVersion)[0] ??
          (conFallback ? docs.slice().sort(porVersion)[0] : undefined);

        if (!doc) {
          this.error.set(msgVacio);
          return;
        }
        this.service.descargarDocumento(doc.rutaArchivo).subscribe({
          next: (blob) => this.descargarBlob(blob, doc.nombreArchivo),
          error: () => this.error.set('No se pudo descargar el documento.'),
        });
      },
      error: () => {
        this.error.set('No se pudo obtener la trazabilidad documental.');
      },
    });
  }

aprobar(): void {
  this.error.set(null);

  if (!this.solicitud?.id) {
    this.error.set('No se encontró la solicitud seleccionada.');
    return;
  }

  this.procesando.set(true);

  this.service
    .aprobarJefe(this.solicitud.id, this.archivo, this.observacion)
    .subscribe({
      next: () => {
        this.procesando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.procesando.set(false);

        const mensaje =
          err?.error?.mensaje ??
          err?.error?.message ??
          'No se pudo aprobar la papeleta.';

        this.error.set(mensaje);
      },
    });
}

  descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = nombreArchivo || `papeleta-${this.solicitud.id}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}