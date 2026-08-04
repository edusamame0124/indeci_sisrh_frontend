import { Component, Inject, computed, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SolicitudRrhh, SolicitudesRrhhService } from '../../services/solicitudes-rrhh';

@Component({
  selector: 'app-enviar-papeleta-dialog',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './../enviar-papeleta-dialog/enviar-papeleta-dialog.html',
  styleUrl: './../enviar-papeleta-dialog/enviar-papeleta-dialog.scss',
})
export class EnviarPapeletaDialogComponent {
  archivo: File | null = null;
  observacion = '';
  enviando = signal(false);
  error = signal<string | null>(null);
  /** true tras un intento de enviar sin haber adjuntado la papeleta firmada. */
  archivoTocado = signal(false);
  archivoInvalido = computed(() => this.archivoTocado() && !this.archivo);

  constructor(
    private readonly service: SolicitudesRrhhService,
    private readonly dialogRef: MatDialogRef<EnviarPapeletaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly solicitud: SolicitudRrhh,
  ) {}

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files?.[0] ?? null;
    if (this.archivo) {
      this.archivoTocado.set(false);
    }
  }

  enviar(): void {
    this.error.set(null);

    if (!this.archivo) {
      this.archivoTocado.set(true);
      this.error.set('Debe adjuntar la papeleta firmada en PDF antes de enviar.');
      return;
    }

    this.enviando.set(true);

    this.service
      .enviarPapeletaFirmada(this.solicitud.id, this.archivo, this.observacion)
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.enviando.set(false);

          const mensaje =
            err?.error?.mensaje ??
            err?.error?.message ??
            'No se pudo enviar la papeleta.';

          this.error.set(mensaje);
        },
      });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
