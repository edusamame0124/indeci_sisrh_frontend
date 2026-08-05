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
  selector: 'app-rechazar-rrhh-papeleta-dialog',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './rechazar-rrhh-papeleta-dialog.html',
  styleUrl: './rechazar-rrhh-papeleta-dialog.scss',
})
export class RechazarRrhhPapeletaDialogComponent {
  observacion = '';

  procesando = signal(false);
  error = signal<string | null>(null);
  /** true tras un intento de rechazar sin haber indicado el motivo. */
  motivoTocado = signal(false);

  constructor(
    private readonly service: SolicitudesRrhhService,
    private readonly dialogRef: MatDialogRef<RechazarRrhhPapeletaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly solicitud: SolicitudRrhh,
  ) {}

  rechazar(): void {
    this.error.set(null);

    const motivo = this.observacion.trim();

    if (!motivo) {
      this.motivoTocado.set(true);
      this.error.set('Debe indicar el motivo del rechazo.');
      return;
    }

    this.procesando.set(true);

    this.service.rechazarRrhh(this.solicitud.id, motivo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.procesando.set(false);

        const mensaje =
          err?.error?.mensaje ??
          err?.error?.message ??
          'No se pudo rechazar la papeleta.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
