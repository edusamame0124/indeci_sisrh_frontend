import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { finalize } from 'rxjs';

import { LegajoApiService } from '../../../legajo/services/legajo-api';
import { Familiar } from '../../models/legajo.model';

export interface FamiliarDialogData {
  empleadoId: number;
  modo: 'CREAR' | 'EDITAR';
  item?: Familiar | null;
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
export class FamiliarDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly dialogRef = inject(MatDialogRef<FamiliarDialog>);

  readonly data = inject<FamiliarDialogData>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    nombreCompleto: ['', [Validators.required, Validators.maxLength(250)]],
    parentesco: ['', [Validators.required, Validators.maxLength(100)]],
    fechaNacimiento: [''],
    tipoDocumentoId: [null as number | null],
    nroDocumento: ['', Validators.maxLength(30)],
    telefono: ['', Validators.maxLength(30)],
  });

  ngOnInit(): void {
    if (this.esEdicion) {
      const item = this.data.item;

      this.form.patchValue({
        nombreCompleto: item?.nombreCompleto ?? '',
        parentesco: item?.parentesco ?? '',
        fechaNacimiento: item?.fechaNacimiento ?? '',
        tipoDocumentoId: item?.tipoDocumentoId ?? null,
        nroDocumento: item?.nroDocumento ?? '',
        telefono: item?.telefono ?? '',
      });
    }
  }

  get esEdicion(): boolean {
    return this.data?.modo === 'EDITAR' && !!this.data?.item?.id;
  }

  get titulo(): string {
    return this.esEdicion ? 'Editar familiar' : 'Agregar familiar';
  }

  cancelar(): void {
    this.dialogRef.close(false);
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

    if (this.esEdicion) {
      this.api
        .actualizarFamiliar(this.data.item!.id!, request)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            console.error('Error actualizando familiar:', err);
            this.error.set(this.obtenerMensajeError(err, 'No se pudo actualizar el familiar.'));
          },
        });

      return;
    }

    this.api
      .registrarFamiliar(request)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error registrando familiar:', err);
          this.error.set(this.obtenerMensajeError(err, 'No se pudo registrar el familiar.'));
        },
      });
  }

  private obtenerMensajeError(err: any, mensajeDefault: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? mensajeDefault;
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}