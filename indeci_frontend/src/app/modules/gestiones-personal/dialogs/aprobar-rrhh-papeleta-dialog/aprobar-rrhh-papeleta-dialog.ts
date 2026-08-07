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
import { NotificacionService } from '../../../../core/services/notificacion.service';

@Component({
  selector: 'app-aprobar-rrhh-papeleta-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
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
    private readonly notificacion: NotificacionService,
    private readonly dialogRef: MatDialogRef<AprobarRrhhPapeletaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly solicitud: SolicitudRrhh,
  ) {}

  /** Detalles de goce real (excluye "_ACTUAL": el período previo que se reprograma/fracciona). */
  private detallesGoceReal() {
    return (this.solicitud.detallesVacacion ?? []).filter((d) => !d.tipo.endsWith('_ACTUAL'));
  }

  /** Días HÁBILES (Art. 35.b/c) — lo que controla el pool de fraccionamiento. */
  diasHabilesSolicitud(): number {
    return this.detallesGoceReal().reduce((acc, d) => acc + (d.totalDias ?? 0), 0);
  }

  /** Días CALENDARIO (Art. 34) — lo que efectivamente descontará el saldo anual al aprobar. */
  diasCalendarioSolicitud(): number {
    return this.detallesGoceReal().reduce((acc, d) => acc + (d.diasCalendario ?? d.totalDias ?? 0), 0);
  }

  /** true si hay diferencia entre lo hábil (control Art. 35) y lo calendario (descuento real Art. 34). */
  diasCalendarioDifiereDeHabiles(): boolean {
    return this.detallesGoceReal().length > 0
      && this.diasCalendarioSolicitud() !== this.diasHabilesSolicitud();
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
  }

  /** SPEC_VACACIONES F9.1-bis — descarga la papeleta firmada más reciente (excluye el sustento). */
  descargarPapeleta(): void {
    this.descargarDoc(
      (docs) => docs.filter((d) => d.etapa !== 'SUSTENTO'),
      'No existe la papeleta firmada para descargar.',
    );
  }

  /** SPEC_VACACIONES F9.1-bis — descarga el sustento subido por el empleado (etapa SUSTENTO). */
  descargarSustento(): void {
    this.descargarDoc(
      (docs) => docs.filter((d) => d.etapa === 'SUSTENTO'),
      'No existe documento de sustento adjunto.',
    );
  }

  private descargarDoc(
    filtro: (docs: { etapa: string; versionDoc: number; rutaArchivo: string; nombreArchivo: string }[]) => {
      etapa: string; versionDoc: number; rutaArchivo: string; nombreArchivo: string;
    }[],
    msgVacio: string,
  ): void {
    this.error.set(null);
    this.service.listarDocumentosSolicitud(this.solicitud.id).subscribe({
      next: (resp) => {
        const docs = resp.data ?? [];
        const doc = filtro(docs)
          .slice()
          .sort((a, b) => Number(b.versionDoc) - Number(a.versionDoc))[0];

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
    this.procesando.set(true);

    this.service.aprobarRrhh(
      this.solicitud.id,
      this.archivo,
      this.observacion,
    ).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        const advertencias = resp.data?.advertencias ?? [];
        if (advertencias.length > 0) {
          // P3 (2026-08-07): aprobada igual, pero avisamos que no tuvo efecto en un período
          // ya cerrado — antes esto se descartaba en silencio.
          this.notificacion.advertencia(`Papeleta aprobada. ${advertencias.join(' ')}`);
        } else {
          this.notificacion.exito('Papeleta aprobada por RR.HH.');
        }
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