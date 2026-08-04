import { Component, Inject, OnInit, computed, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  DocumentoSolicitud,
  SolicitudRrhh,
  SolicitudesRrhhService,
} from '../../services/solicitudes-rrhh';
import { AuthService } from '../../../../core/services/auth.service';

/** Nombre fijo que el backend usa para el PDF de relleno cuando se aprobó sin adjunto. */
const NOMBRE_DOC_FABRICADO = 'solicitud_no_requiere_firma.pdf';

@Component({
  selector: 'app-trazabilidad-papeleta-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './trazabilidad-papeleta-dialog.html',
  styleUrl: './trazabilidad-papeleta-dialog.scss',
})
export class TrazabilidadPapeletaDialogComponent implements OnInit {
  documentos = signal<DocumentoSolicitud[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  /** Subsanación: solo quien tiene la aprobación final de RRHH puede reescribir el expediente. */
  readonly puedeSubsanar = computed(() => this.auth.permisos().includes('PAP_APROBAR_RRHH'));

  mostrarFormSubsanar = signal(false);
  etapaSubsanar: 'JEFE' | 'RRHH' | '' = '';
  archivoSubsanar: File | null = null;
  observacionSubsanar = '';
  subsanando = signal(false);
  errorSubsanar = signal<string | null>(null);

  constructor(
    private readonly service: SolicitudesRrhhService,
    private readonly auth: AuthService,
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

  /** true si el documento es el PDF de relleno generado por el sistema (aprobación sin adjunto). */
  esFabricado(doc: DocumentoSolicitud): boolean {
    return doc.nombreArchivo === NOMBRE_DOC_FABRICADO;
  }

  toggleFormSubsanar(): void {
    this.mostrarFormSubsanar.update((v) => !v);
    this.errorSubsanar.set(null);
  }

  seleccionarArchivoSubsanar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSubsanar = input.files?.[0] ?? null;
  }

  subsanar(): void {
    this.errorSubsanar.set(null);

    if (!this.etapaSubsanar) {
      this.errorSubsanar.set('Seleccione la etapa (Jefe o RRHH) a subsanar.');
      return;
    }

    if (!this.archivoSubsanar) {
      this.errorSubsanar.set('Debe adjuntar el PDF real de la papeleta firmada.');
      return;
    }

    this.subsanando.set(true);

    this.service
      .subsanarDocumento(
        this.solicitud.id,
        this.etapaSubsanar,
        this.archivoSubsanar,
        this.observacionSubsanar,
      )
      .subscribe({
        next: () => {
          this.subsanando.set(false);
          this.mostrarFormSubsanar.set(false);
          this.etapaSubsanar = '';
          this.archivoSubsanar = null;
          this.observacionSubsanar = '';
          this.cargarDocumentos();
        },
        error: (err) => {
          this.subsanando.set(false);

          const mensaje =
            err?.error?.mensaje ??
            err?.error?.message ??
            'No se pudo subsanar el documento.';

          this.errorSubsanar.set(mensaje);
        },
      });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}