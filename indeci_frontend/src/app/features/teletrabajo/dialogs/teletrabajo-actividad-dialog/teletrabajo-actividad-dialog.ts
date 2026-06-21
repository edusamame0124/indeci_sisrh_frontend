import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TeletrabajoApiService } from '../../services/teletrabajo-api';
import {
  GuardarTeletrabajoDetalleRequest,
  TeletrabajoCatalogo,
  TeletrabajoDetalle,
} from '../../models/teletrabajo.model';

export interface TeletrabajoActividadDialogData {
  reporteId: number;
  detalle?: TeletrabajoDetalle | null;
}

@Component({
  selector: 'app-teletrabajo-actividad-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './teletrabajo-actividad-dialog.html',
  styleUrl: './teletrabajo-actividad-dialog.scss',
})
export class TeletrabajoActividadDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TeletrabajoActividadDialog>);
  private readonly teletrabajoApi = inject(TeletrabajoApiService);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly estadosCumplimiento = signal<TeletrabajoCatalogo[]>([]);
  readonly conformidades = signal<TeletrabajoCatalogo[]>([]);

  readonly form = this.fb.group({
    nroOrden: [null as number | null],
    actividadProgramada: ['', Validators.required],
    actividadEjecutada: ['', Validators.required],
    medioVerificacion: [''],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    estadoCumplimientoId: [null as number | null, Validators.required],
    porcentajeAvance: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    incidenciaObservacion: [''],
    conformidadId: [null as number | null, Validators.required],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: TeletrabajoActividadDialogData,
  ) {}

  get esEdicion(): boolean {
    return !!this.data?.detalle?.id;
  }
  
  ngOnInit(): void {
    this.cargarCatalogos();

    if (this.data.detalle) {
      this.cargarDetalleEnFormulario(this.data.detalle);
    }
  }

  cargarCatalogos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.teletrabajoApi.listarEstadosCumplimiento().subscribe({
      next: (estados) => {
        this.estadosCumplimiento.set(estados ?? []);

        this.teletrabajoApi.listarConformidades().subscribe({
          next: (conformidades) => {
            this.conformidades.set(conformidades ?? []);
            this.cargando.set(false);
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error cargando conformidades:', err);
            this.error.set('No se pudieron cargar las conformidades.');
            this.cargando.set(false);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando estados de cumplimiento:', err);
        this.error.set('No se pudieron cargar los estados de cumplimiento.');
        this.cargando.set(false);
      },
    });
  }

  cargarDetalleEnFormulario(detalle: TeletrabajoDetalle): void {
    this.form.patchValue({
      nroOrden: detalle.nroOrden ?? null,
      actividadProgramada: detalle.actividadProgramada ?? '',
      actividadEjecutada: detalle.actividadEjecutada ?? '',
      medioVerificacion: detalle.medioVerificacion ?? '',
      fechaInicio: detalle.fechaInicio ?? '',
      fechaFin: detalle.fechaFin ?? '',
      estadoCumplimientoId: detalle.estadoCumplimientoId ?? null,
      porcentajeAvance: detalle.porcentajeAvance ?? 0,
      incidenciaObservacion: detalle.incidenciaObservacion ?? '',
      conformidadId: detalle.conformidadId ?? null,
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();

    if (!raw.fechaInicio || !raw.fechaFin) {
      this.error.set('Ingrese fecha de inicio y fecha fin.');
      return;
    }

    if (raw.fechaFin < raw.fechaInicio) {
      this.error.set('La fecha fin no puede ser menor que la fecha de inicio.');
      return;
    }

    if (
      !raw.actividadProgramada ||
      !raw.actividadEjecutada ||
      !raw.estadoCumplimientoId ||
      !raw.conformidadId ||
      raw.porcentajeAvance === null ||
      raw.porcentajeAvance === undefined
    ) {
      this.error.set('Complete los campos obligatorios.');
      return;
    }

    const request: GuardarTeletrabajoDetalleRequest = {
      reporteId: this.data.reporteId,
      nroOrden: raw.nroOrden ?? null,
      actividadProgramada: raw.actividadProgramada.trim(),
      actividadEjecutada: raw.actividadEjecutada.trim(),
      medioVerificacion: raw.medioVerificacion?.trim() || null,
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin,
      estadoCumplimientoId: raw.estadoCumplimientoId,
      porcentajeAvance: Number(raw.porcentajeAvance),
      incidenciaObservacion: raw.incidenciaObservacion?.trim() || null,
      conformidadId: raw.conformidadId,
    };

    this.guardando.set(true);
    this.error.set(null);

    const detalleId = this.data.detalle?.id;

    const request$ = detalleId
      ? this.teletrabajoApi.actualizarDetalle(detalleId, request)
      : this.teletrabajoApi.agregarDetalle(request);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error guardando actividad:', err);
        this.error.set('No se pudo guardar la actividad.');
        this.guardando.set(false);
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
