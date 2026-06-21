import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LegajoApiService } from '../../../legajo/services/legajo-api';
import { ExperienciaLaboral } from '../../models/legajo.model';
import { LegajoDocumento } from '../../models/legajo.model';
import { finalize, Observable, of, switchMap } from 'rxjs';

import { LegajoDocumentoService } from '../../services/legajo-documento';
import { LegajoDocumentoOrigen } from '../../services/legajo-documento';
export interface ExperienciaLaboralDialogData {
  empleadoId: number;
}

@Component({
  selector: 'app-experiencia-laboral-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './experiencia-laboral-dialog.html',
  styleUrl: './experiencia-laboral-dialog.scss',
})
export class ExperienciaLaboralDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly dialogRef = inject(MatDialogRef<ExperienciaLaboralDialog>);
  private readonly data = inject<ExperienciaLaboralDialogData>(MAT_DIALOG_DATA);
  private readonly documentoService = inject(LegajoDocumentoService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    empresa: ['', [Validators.required, Validators.maxLength(250)]],
    cargo: ['', [Validators.required, Validators.maxLength(200)]],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    funciones: ['', Validators.maxLength(1000)],
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

    this.subirSustento$('EXPERIENCIA_LABORAL', `Sustento de experiencia laboral - ${raw.empresa}`)
      .pipe(
        switchMap((documento) => {
          const request: ExperienciaLaboral = {
            empleadoId: this.data.empleadoId,
            empresa: raw.empresa?.trim() ?? '',
            cargo: raw.cargo?.trim() ?? '',
            fechaInicio: raw.fechaInicio ?? '',
            fechaFin: raw.fechaFin || undefined,
            funciones: raw.funciones?.trim() || undefined,
            legajoDocumentoId: documento?.id ?? null,
          };

          return this.api.registrarExperienciaLaboral(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando experiencia laboral:', err);
          this.error.set(
            this.obtenerMensajeError(err, 'No se pudo guardar la experiencia laboral.'),
          );
        },
      });
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
