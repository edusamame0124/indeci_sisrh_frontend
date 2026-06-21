import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LegajoApiService } from '../../services/legajo-api';
import { ConocimientoInformatico } from '../../models/legajo.model';
import { LegajoDocumento } from '../../models/legajo.model';
import { finalize, Observable, of, switchMap } from 'rxjs';

import { LegajoDocumentoService } from '../../services/legajo-documento';
import { LegajoDocumentoOrigen } from '../../services/legajo-documento';
export interface ConocimientoInformaticoDialogData {
  empleadoId: number;
}

@Component({
  selector: 'app-conocimiento-informatico-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './conocimiento-informatico-dialog.html',
  styleUrl: './conocimiento-informatico-dialog.scss',
})
export class ConocimientoInformaticoDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly dialogRef = inject(MatDialogRef<ConocimientoInformaticoDialog>);
  private readonly data = inject<ConocimientoInformaticoDialogData>(MAT_DIALOG_DATA);
  private readonly documentoService = inject(LegajoDocumentoService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    herramienta: ['', [Validators.required, Validators.maxLength(150)]],
    nivel: ['', [Validators.required, Validators.maxLength(80)]],
    certificado: [false],
    legajoDocumentoId: [null as number | null],

    nombreDocumento: [''],
    fechaDocumento: [''],
    observacionDocumento: [''],
  });

  cancelar(): void {
    this.dialogRef.close(false);
  }
  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSustento = input.files?.[0] ?? null;
  }

  private subirSustento$(
    origen: LegajoDocumentoOrigen,
    nombreDocumentoDefault: string,
    subcategoriaId?: number | null,
  ): Observable<LegajoDocumento | null> {
    const raw = this.form.getRawValue();

    if (!this.archivoSustento) {
      return of(null);
    }

    return this.documentoService.subirSustento({
      empleadoId: this.data.empleadoId,
      origen,
      nombreDocumento: raw.nombreDocumento?.trim() || nombreDocumentoDefault,
      fechaDocumento: raw.fechaDocumento || null,
      observacion: raw.observacionDocumento?.trim() || null,
      referenciaId: null,
      subcategoriaId: subcategoriaId ?? null,
      file: this.archivoSustento,
    });
  }

  private obtenerMensajeError(err: any, mensajeDefault: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? mensajeDefault;
  }
  guardar(): void {
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete los campos obligatorios.');
      return;
    }

    if (!this.data.empleadoId) {
      this.error.set('No se encontró el empleadoId.');
      return;
    }

    const raw = this.form.getRawValue();

    this.guardando.set(true);

    this.subirSustento$('CONOCIMIENTO_INFORMATICO', `Sustento de conocimiento - ${raw.herramienta}`)
      .pipe(
        switchMap((documento) => {
          const request: ConocimientoInformatico = {
            empleadoId: this.data.empleadoId,
            herramienta: raw.herramienta?.trim() ?? '',
            nivel: raw.nivel?.trim() ?? '',
            certificado: raw.certificado ? 1 : 0,
            legajoDocumentoId: documento?.id ?? null,
          };

          return this.api.registrarConocimiento(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando conocimiento informático:', err);
          this.error.set(
            this.obtenerMensajeError(err, 'No se pudo guardar el conocimiento informático.'),
          );
        },
      });
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
