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
import { Familiar } from '../../models/legajo.model';
import { LegajoDocumento } from '../../models/legajo.model';

import { LegajoDocumentoService } from '../../services/legajo-documento';
import { LegajoDocumentoOrigen } from '../../services/legajo-documento';
export interface FamiliarDialogData {
  empleadoId: number;
}

@Component({
  selector: 'app-familiar-dialog',
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
  templateUrl: './familiar-dialog.html',
  styleUrl: './familiar-dialog.scss',
})
export class FamiliarDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly dialogRef = inject(MatDialogRef<FamiliarDialog>);
  private readonly data = inject<FamiliarDialogData>(MAT_DIALOG_DATA);
private readonly documentoService = inject(LegajoDocumentoService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    nombreCompleto: ['', [Validators.required, Validators.maxLength(250)]],
    parentesco: ['', [Validators.required, Validators.maxLength(100)]],
    fechaNacimiento: [''],
    tipoDocumentoId: [null as number | null],
    nroDocumento: ['', Validators.maxLength(30)],
    telefono: ['', Validators.maxLength(30)],

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

    const request: Familiar = {
      empleadoId: this.data.empleadoId,
      nombreCompleto: raw.nombreCompleto?.trim() ?? '',
      parentesco: raw.parentesco?.trim() ?? '',
      fechaNacimiento: raw.fechaNacimiento || undefined,
      tipoDocumentoId: raw.tipoDocumentoId ? Number(raw.tipoDocumentoId) : undefined,
      nroDocumento: raw.nroDocumento?.trim() || undefined,
      telefono: raw.telefono?.trim() || undefined,
    };

    this.guardando.set(true);

    this.api.registrarFamiliar(request).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error registrando familiar:', err);
        this.guardando.set(false);

        const mensaje =
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar el familiar.';

        this.error.set(mensaje);
      },
    });
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
