import { Component, Inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
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
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
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

  descargarPapeleta(): void {
    this.service.listarDocumentosSolicitud(this.solicitud.id).subscribe({
      next: (resp) => {
        const docs = resp.data ?? [];

        if (docs.length === 0) {
          this.error.set('No existe documento firmado por el empleado para descargar.');
          return;
        }

        const ultimo = docs
          .slice()
          .sort((a, b) => Number(b.versionDoc) - Number(a.versionDoc))[0];

        this.service.descargarDocumento(ultimo.rutaArchivo).subscribe({
          next: (blob) => this.descargarBlob(blob, ultimo.nombreArchivo),
          error: () => this.error.set('No se pudo descargar la papeleta.'),
        });
      },
      error: () => {
        this.error.set('No se pudo obtener la trazabilidad documental.');
      },
    });
  }

  aprobar(): void {
    if (!this.archivo) {
      this.error.set('Debe adjuntar la papeleta firmada por el jefe inmediato.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    this.service.aprobarJefe(
      this.solicitud.id,
      this.archivo,
      this.observacion,
    ).subscribe({
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