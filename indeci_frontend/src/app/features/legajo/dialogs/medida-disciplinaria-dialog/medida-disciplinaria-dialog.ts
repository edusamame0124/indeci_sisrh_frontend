import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LegajoApiService } from '../../services/legajo-api';
import { MedidaDisciplinaria } from '../../models/legajo.model';
import { LegajoDocumento } from '../../models/legajo.model';
import { finalize, Observable, of, switchMap } from 'rxjs';
import { LegajoDocumentoService } from '../../services/legajo-documento';
import { LegajoDocumentoOrigen } from '../../services/legajo-documento';

export interface MedidaDisciplinariaDialogData {
  empleadoId: number;
}

@Component({
  selector: 'app-medida-disciplinaria-dialog',
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
  templateUrl: './medida-disciplinaria-dialog.html',
  styleUrl: './medida-disciplinaria-dialog.scss',
})
export class MedidaDisciplinariaDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly dialogRef = inject(MatDialogRef<MedidaDisciplinariaDialog>);
  private readonly data = inject<MedidaDisciplinariaDialogData>(MAT_DIALOG_DATA);
  private readonly documentoService = inject(LegajoDocumentoService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    tipoMedida: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
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

    this.subirSustento$(
      'MEDIDA_DISCIPLINARIA',
      `Sustento de medida disciplinaria - ${raw.tipoMedida}`,
    )
      .pipe(
        switchMap((documento) => {
          const request: MedidaDisciplinaria = {
            empleadoId: this.data.empleadoId,
            tipoMedida: raw.tipoMedida?.trim() ?? '',
            descripcion: raw.descripcion?.trim() ?? '',
            fechaInicio: raw.fechaInicio ?? '',
            fechaFin: raw.fechaFin || undefined,
            legajoDocumentoId: documento?.id ?? null,
          };

          return this.api.registrarMedidaDisciplinaria(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando medida disciplinaria:', err);
          this.error.set(
            this.obtenerMensajeError(err, 'No se pudo guardar la medida disciplinaria.'),
          );
        },
      });
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
