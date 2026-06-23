import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { finalize, Observable, of, switchMap } from 'rxjs';

import { LegajoApiService } from '../../../legajo/services/legajo-api';
import { LegajoDocumento, Reconocimiento } from '../../models/legajo.model';

import {
  LegajoDocumentoOrigen,
  LegajoDocumentoService,
} from '../../services/legajo-documento';

export interface ReconocimientoDialogData {
  empleadoId: number;
  modo: 'CREAR' | 'EDITAR';
  item?: Reconocimiento | null;
}

@Component({
  selector: 'app-reconocimiento-dialog',
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
  templateUrl: './reconocimiento-dialog.html',
  styleUrl: './reconocimiento-dialog.scss',
})
export class ReconocimientoDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly documentoService = inject(LegajoDocumentoService);
  private readonly dialogRef = inject(MatDialogRef<ReconocimientoDialog>);

  readonly data = inject<ReconocimientoDialogData>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    tipoReconocimiento: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
    fechaReconocimiento: ['', Validators.required],
    legajoDocumentoId: [null as number | null],

    nombreDocumento: [''],
    fechaDocumento: [''],
    observacionDocumento: [''],
  });

  ngOnInit(): void {
    if (this.esEdicion) {
      const item = this.data.item;

      this.form.patchValue({
        tipoReconocimiento: item?.tipoReconocimiento ?? '',
        descripcion: item?.descripcion ?? '',
        fechaReconocimiento: item?.fechaReconocimiento ?? '',
        legajoDocumentoId: item?.legajoDocumentoId ?? null,

        nombreDocumento: '',
        fechaDocumento: '',
        observacionDocumento: '',
      });
    }
  }

  get esEdicion(): boolean {
    return this.data?.modo === 'EDITAR' && !!this.data?.item?.id;
  }

  get titulo(): string {
    return this.esEdicion ? 'Editar reconocimiento' : 'Agregar reconocimiento';
  }

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

    this.guardando.set(true);

    if (this.esEdicion) {
      const request: Reconocimiento = {
        empleadoId: this.data.empleadoId,
        tipoReconocimiento: raw.tipoReconocimiento?.trim() ?? '',
        descripcion: raw.descripcion?.trim() ?? '',
        fechaReconocimiento: raw.fechaReconocimiento ?? '',

        // En edición NO se cambia el documento.
        // Se conserva el sustento actual.
        legajoDocumentoId: this.data.item?.legajoDocumentoId ?? null,
      };

      this.api
        .actualizarReconocimiento(this.data.item!.id!, request)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            console.error('Error actualizando reconocimiento:', err);
            this.error.set(
              this.obtenerMensajeError(err, 'No se pudo actualizar el reconocimiento.'),
            );
          },
        });

      return;
    }

    this.subirSustento$(
      'RECONOCIMIENTO',
      `Sustento de reconocimiento - ${raw.tipoReconocimiento}`,
    )
      .pipe(
        switchMap((documento) => {
          const request: Reconocimiento = {
            empleadoId: this.data.empleadoId,
            tipoReconocimiento: raw.tipoReconocimiento?.trim() ?? '',
            descripcion: raw.descripcion?.trim() ?? '',
            fechaReconocimiento: raw.fechaReconocimiento ?? '',
            legajoDocumentoId: documento?.id ?? null,
          };

          return this.api.registrarReconocimiento(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando reconocimiento:', err);
          this.error.set(
            this.obtenerMensajeError(err, 'No se pudo guardar el reconocimiento.'),
          );
        },
      });
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

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}