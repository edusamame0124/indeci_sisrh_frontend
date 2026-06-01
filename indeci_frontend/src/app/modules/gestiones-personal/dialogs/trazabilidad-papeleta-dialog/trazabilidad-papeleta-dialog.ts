import { Component, Inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  DocumentoSolicitud,
  SolicitudRrhh,
  SolicitudesRrhhService,
} from '../../services/solicitudes-rrhh';

@Component({
  selector: 'app-trazabilidad-papeleta-dialog',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './trazabilidad-papeleta-dialog.html',
  styleUrl: './trazabilidad-papeleta-dialog.scss',
})
export class TrazabilidadPapeletaDialogComponent implements OnInit {
  documentos = signal<DocumentoSolicitud[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor(
    private readonly service: SolicitudesRrhhService,
    private readonly dialogRef: MatDialogRef<TrazabilidadPapeletaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly solicitud: SolicitudRrhh,
  ) {}

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service.listarDocumentosSolicitud(this.solicitud.id).subscribe({
      next: (resp) => {
        this.documentos.set(resp.data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la trazabilidad documental.');
        this.cargando.set(false);
      },
    });
  }

  descargar(doc: DocumentoSolicitud): void {
    this.service.descargarDocumento(doc.rutaArchivo).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = doc.nombreArchivo || `documento-${doc.id}.pdf`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error.set('No se pudo descargar el documento seleccionado.');
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}