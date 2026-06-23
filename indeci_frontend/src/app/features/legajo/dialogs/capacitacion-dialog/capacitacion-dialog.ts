import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { finalize, Observable, of, switchMap } from 'rxjs';

import { LegajoApiService } from '../../../legajo/services/legajo-api';
import { Capacitacion, LegajoDocumento } from '../../models/legajo.model';

import {
  LegajoDocumentoOrigen,
  LegajoDocumentoService,
} from '../../services/legajo-documento';

export interface LegajoRegistroDialogData {
  empleadoId: number;
  modo: 'CREAR' | 'EDITAR';
  item?: Capacitacion | null;
}

@Component({
  selector: 'app-capacitacion-dialog',
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
  templateUrl: './capacitacion-dialog.html',
  styleUrl: './capacitacion-dialog.scss',
})
export class CapacitacionDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly documentoService = inject(LegajoDocumentoService);
  private readonly dialogRef = inject(MatDialogRef<CapacitacionDialog>);
  readonly data = inject<LegajoRegistroDialogData>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    nombreCurso: ['', [Validators.required, Validators.maxLength(250)]],
    institucion: ['', [Validators.required, Validators.maxLength(250)]],
    horas: [null as number | null, [Validators.required, Validators.min(1)]],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    certificado: [false],
    legajoDocumentoId: [null as number | null],

    nombreDocumento: [''],
    fechaDocumento: [''],
    observacionDocumento: [''],
  });

  ngOnInit(): void {
    if (this.esEdicion) {
      const item = this.data.item;

      this.form.patchValue({
        nombreCurso: item?.nombreCurso ?? '',
        institucion: item?.institucion ?? '',
        horas: item?.horas ?? null,
        fechaInicio: item?.fechaInicio ?? '',
        fechaFin: item?.fechaFin ?? '',
        certificado: item?.certificado === 1,
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
    return this.esEdicion ? 'Editar capacitación' : 'Agregar capacitación';
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
      const request: Capacitacion = {
        empleadoId: this.data.empleadoId,
        nombreCurso: raw.nombreCurso?.trim() ?? '',
        institucion: raw.institucion?.trim() ?? '',
        horas: Number(raw.horas),
        fechaInicio: raw.fechaInicio ?? '',
        fechaFin: raw.fechaFin ?? '',
        certificado: raw.certificado ? 1 : 0,

        // IMPORTANTE:
        // En edición NO se cambia el documento.
        // Se conserva el legajoDocumentoId actual.
        legajoDocumentoId: this.data.item?.legajoDocumentoId ?? null,
      };

      this.api
        .actualizarCapacitacion(this.data.item!.id!, request)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            console.error('Error actualizando capacitación:', err);
            this.error.set(
              this.obtenerMensajeError(err, 'No se pudo actualizar la capacitación.'),
            );
          },
        });

      return;
    }

    this.subirSustento$('CAPACITACION', `Sustento de capacitación - ${raw.nombreCurso}`)
      .pipe(
        switchMap((documento) => {
          const request: Capacitacion = {
            empleadoId: this.data.empleadoId,
            nombreCurso: raw.nombreCurso?.trim() ?? '',
            institucion: raw.institucion?.trim() ?? '',
            horas: Number(raw.horas),
            fechaInicio: raw.fechaInicio ?? '',
            fechaFin: raw.fechaFin ?? '',
            certificado: raw.certificado ? 1 : 0,
            legajoDocumentoId: documento?.id ?? null,
          };

          return this.api.registrarCapacitacion(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando capacitación:', err);
          this.error.set(this.obtenerMensajeError(err, 'No se pudo guardar la capacitación.'));
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