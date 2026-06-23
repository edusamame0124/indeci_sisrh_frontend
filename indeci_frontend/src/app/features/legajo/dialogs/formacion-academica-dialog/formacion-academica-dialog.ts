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

import { LegajoApiService } from '../../services/legajo-api';
import { FormacionAcademica, LegajoDocumento } from '../../models/legajo.model';

import {
  LegajoDocumentoOrigen,
  LegajoDocumentoService,
} from '../../services/legajo-documento';

export interface FormacionAcademicaDialogData {
  empleadoId: number;
  modo: 'CREAR' | 'EDITAR';
  item?: FormacionAcademica | null;
}

@Component({
  selector: 'app-formacion-academica-dialog',
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
  templateUrl: './formacion-academica-dialog.html',
  styleUrl: './formacion-academica-dialog.scss',
})
export class FormacionAcademicaDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly documentoService = inject(LegajoDocumentoService);
  private readonly dialogRef = inject(MatDialogRef<FormacionAcademicaDialog>);

  readonly data = inject<FormacionAcademicaDialogData>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  archivoSustento: File | null = null;

  readonly form = this.fb.group({
    nivelInstruccionId: [null as number | null, Validators.required],
    gradoAcademicoId: [null as number | null],
    institucion: ['', [Validators.required, Validators.maxLength(250)]],
    carrera: ['', [Validators.required, Validators.maxLength(250)]],
    fechaInicio: [''],
    fechaFin: [''],
    egresado: [false],
    bachiller: [false],
    titulado: [false],
    nroTitulo: ['', Validators.maxLength(100)],
    legajoDocumentoId: [null as number | null],

    nombreDocumento: [''],
    fechaDocumento: [''],
    observacionDocumento: [''],
  });

  ngOnInit(): void {
    if (this.esEdicion) {
      const item = this.data.item;

      this.form.patchValue({
        nivelInstruccionId: item?.nivelInstruccionId ?? null,
        gradoAcademicoId: item?.gradoAcademicoId ?? null,
        institucion: item?.institucion ?? '',
        carrera: item?.carrera ?? '',
        fechaInicio: item?.fechaInicio ?? '',
        fechaFin: item?.fechaFin ?? '',
        egresado: item?.egresado === 1,
        bachiller: item?.bachiller === 1,
        titulado: item?.titulado === 1,
        nroTitulo: item?.nroTitulo ?? '',
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
    return this.esEdicion ? 'Editar formación académica' : 'Agregar formación académica';
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
      const request: FormacionAcademica = {
        empleadoId: this.data.empleadoId,
        nivelInstruccionId: raw.nivelInstruccionId
          ? Number(raw.nivelInstruccionId)
          : undefined,
        gradoAcademicoId: raw.gradoAcademicoId
          ? Number(raw.gradoAcademicoId)
          : undefined,
        institucion: raw.institucion?.trim() ?? '',
        carrera: raw.carrera?.trim() ?? '',
        fechaInicio: raw.fechaInicio || undefined,
        fechaFin: raw.fechaFin || undefined,
        egresado: raw.egresado ? 1 : 0,
        bachiller: raw.bachiller ? 1 : 0,
        titulado: raw.titulado ? 1 : 0,
        nroTitulo: raw.nroTitulo?.trim() || undefined,

        // IMPORTANTE:
        // En edición NO se cambia el documento.
        // Se conserva el sustento actual.
        legajoDocumentoId: this.data.item?.legajoDocumentoId ?? null,
      };

      this.api
        .actualizarFormacion(this.data.item!.id!, request)
        .pipe(finalize(() => this.guardando.set(false)))
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            console.error('Error actualizando formación académica:', err);
            this.error.set(
              this.obtenerMensajeError(
                err,
                'No se pudo actualizar la formación académica.',
              ),
            );
          },
        });

      return;
    }

    this.subirSustento$(
      'FORMACION_ACADEMICA',
      `Sustento de formación académica - ${raw.institucion}`,
    )
      .pipe(
        switchMap((documento) => {
          const request: FormacionAcademica = {
            empleadoId: this.data.empleadoId,
            nivelInstruccionId: raw.nivelInstruccionId
              ? Number(raw.nivelInstruccionId)
              : undefined,
            gradoAcademicoId: raw.gradoAcademicoId
              ? Number(raw.gradoAcademicoId)
              : undefined,
            institucion: raw.institucion?.trim() ?? '',
            carrera: raw.carrera?.trim() ?? '',
            fechaInicio: raw.fechaInicio || undefined,
            fechaFin: raw.fechaFin || undefined,
            egresado: raw.egresado ? 1 : 0,
            bachiller: raw.bachiller ? 1 : 0,
            titulado: raw.titulado ? 1 : 0,
            nroTitulo: raw.nroTitulo?.trim() || undefined,
            legajoDocumentoId: documento?.id ?? null,
          };

          return this.api.registrarFormacion(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando formación académica:', err);
          this.error.set(
            this.obtenerMensajeError(
              err,
              'No se pudo guardar la formación académica.',
            ),
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