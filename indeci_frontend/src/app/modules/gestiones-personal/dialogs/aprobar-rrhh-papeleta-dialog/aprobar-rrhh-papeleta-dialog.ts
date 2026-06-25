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
  selector: 'app-aprobar-rrhh-papeleta-dialog',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './aprobar-rrhh-papeleta-dialog.html',
  styleUrl: './aprobar-rrhh-papeleta-dialog.scss',
})
export class AprobarRrhhPapeletaDialogComponent {
  archivo: File | null = null;
  observacion = '';

  procesando = signal(false);
  error = signal<string | null>(null);

  constructor(
    private readonly service: SolicitudesRrhhService,
    private readonly dialogRef: MatDialogRef<AprobarRrhhPapeletaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly solicitud: SolicitudRrhh,
  ) {}

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
  }

  descargarPapeleta(): void {
    this.error.set(null);

    this.service.listarDocumentosSolicitud(this.solicitud.id).subscribe({
      next: (resp) => {
        const docs = resp.data ?? [];

        if (docs.length === 0) {
          this.error.set('No existe documento firmado para descargar.');
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
    

    this.procesando.set(true);
    this.error.set(null);

    this.service.aprobarRrhh(
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
          'No se pudo aprobar la papeleta por RRHH.';

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