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
import { MatSelectModule } from '@angular/material/select';

import { finalize, forkJoin, Observable, of, switchMap } from 'rxjs';

import { LegajoApiService } from '../../services/legajo-api';
import { LegajoDocumentoOrigen, LegajoDocumentoService } from '../../services/legajo-documento';
import { FormacionAcademica, LegajoDocumento } from '../../models/legajo.model';

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
    MatSelectModule,
  ],
  templateUrl: './formacion-academica-dialog.html',
  styleUrl: './formacion-academica-dialog.scss',
})
export class FormacionAcademicaDialog implements OnInit {
  // Servicios
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegajoApiService);
  private readonly documentoService = inject(LegajoDocumentoService);
  private readonly dialogRef = inject(MatDialogRef<FormacionAcademicaDialog>);

  // Data recibida desde el componente padre
  readonly data = inject<FormacionAcademicaDialogData>(MAT_DIALOG_DATA);

  // Estado de pantalla
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly cargandoCatalogos = signal(false);

  // Catálogos
  readonly nivelesInstruccion = signal<any[]>([]);
  readonly gradosAcademicos = signal<any[]>([]);

  // Archivo opcional de sustento
  archivoSustento: File | null = null;

  // Formulario principal
  readonly form = this.fb.group({
    nivelInstruccionId: [null as number | null, Validators.required],
    gradoAcademicoId: [null as number | null, Validators.required],

    institucion: ['', [Validators.required, Validators.maxLength(250)]],
    carrera: ['', [Validators.required, Validators.maxLength(250)]],

    fechaInicio: [''],
    fechaFin: [''],

    egresado: [false],
    bachiller: [false],
    titulado: [false],

    nroTitulo: ['', Validators.maxLength(100)],
    legajoDocumentoId: [null as number | null],

    // Datos del documento de sustento
    nombreDocumento: [''],
    fechaDocumento: [''],
    observacionDocumento: [''],
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarDatosEdicion();
  }

  // Indica si el diálogo está editando un registro existente
  get esEdicion(): boolean {
    return this.data?.modo === 'EDITAR' && !!this.data?.item?.id;
  }

  // Título dinámico del modal
  get titulo(): string {
    return this.esEdicion ? 'Editar formación académica' : 'Agregar formación académica';
  }

  // Carga catálogos necesarios para los selects
  cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);

    forkJoin({
      niveles: this.api.listarNivelesInstruccion(),
      grados: this.api.listarGradosAcademicos(),
    })
      .pipe(finalize(() => this.cargandoCatalogos.set(false)))
      .subscribe({
        next: ({ niveles, grados }) => {
          this.nivelesInstruccion.set(
            (niveles ?? []).filter((x) => Number(x.activo ?? 1) === 1),
          );

          this.gradosAcademicos.set(
            (grados ?? []).filter((x) => Number(x.activo ?? 1) === 1),
          );
        },
        error: () => {
          this.error.set('No se pudieron cargar los catálogos.');
        },
      });
  }

  // Si el modal está en modo edición, llena el formulario con los datos existentes
  private cargarDatosEdicion(): void {
    if (!this.esEdicion) {
      return;
    }

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

  // Cierra el modal sin guardar
  cancelar(): void {
    this.dialogRef.close(false);
  }

  // Captura el archivo seleccionado
  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSustento = input.files?.[0] ?? null;
  }

  // Guarda o actualiza la formación académica
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

    this.guardando.set(true);

    if (this.esEdicion) {
      this.actualizarFormacion();
      return;
    }

    this.registrarFormacion();
  }

  // Registra una nueva formación académica
  private registrarFormacion(): void {
    const raw = this.form.getRawValue();

    this.subirSustento$(
      'FORMACION_ACADEMICA',
      `Sustento de formación académica - ${raw.institucion}`,
    )
      .pipe(
        switchMap((documento) => {
          const request = this.construirRequest(documento?.id ?? null);
          return this.api.registrarFormacion(request);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error guardando formación académica:', err);
          this.error.set(
            this.obtenerMensajeError(err, 'No se pudo guardar la formación académica.'),
          );
        },
      });
  }

  // Actualiza una formación académica existente
  private actualizarFormacion(): void {
    const request = this.construirRequest(this.data.item?.legajoDocumentoId ?? null);

    this.api
      .actualizarFormacion(this.data.item!.id!, request)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error('Error actualizando formación académica:', err);
          this.error.set(
            this.obtenerMensajeError(err, 'No se pudo actualizar la formación académica.'),
          );
        },
      });
  }

  // Construye el objeto que espera el backend
  private construirRequest(legajoDocumentoId: number | null): FormacionAcademica {
    const raw = this.form.getRawValue();

    return {
      empleadoId: this.data.empleadoId,

      nivelInstruccionId: Number(raw.nivelInstruccionId),
      gradoAcademicoId: Number(raw.gradoAcademicoId),

      institucion: raw.institucion?.trim() ?? '',
      carrera: raw.carrera?.trim() ?? '',

      fechaInicio: raw.fechaInicio || undefined,
      fechaFin: raw.fechaFin || undefined,

      egresado: raw.egresado ? 1 : 0,
      bachiller: raw.bachiller ? 1 : 0,
      titulado: raw.titulado ? 1 : 0,

      nroTitulo: raw.nroTitulo?.trim() || null,
      legajoDocumentoId,
    };
  }

  // Sube el documento de sustento antes de registrar la formación
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

  // Extrae el mensaje de error que devuelve el backend
  private obtenerMensajeError(err: any, mensajeDefault: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? mensajeDefault;
  }

  // Valida si un campo debe mostrar error en pantalla
  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}