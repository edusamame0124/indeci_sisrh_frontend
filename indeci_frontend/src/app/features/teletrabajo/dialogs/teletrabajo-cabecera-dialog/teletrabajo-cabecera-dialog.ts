import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TeletrabajoApiService } from '../../services/teletrabajo-api';
import {
  TeletrabajoCatalogo,
  TeletrabajoTrabajadorItem,
} from '../../models/teletrabajo.model';

@Component({
  selector: 'app-teletrabajo-cabecera-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './teletrabajo-cabecera-dialog.html',
  styleUrl: './teletrabajo-cabecera-dialog.scss',
})
export class TeletrabajoCabeceraDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TeletrabajoCabeceraDialog>);
  private readonly teletrabajoApi = inject(TeletrabajoApiService);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly buscandoTrabajador = signal(false);
  readonly error = signal<string | null>(null);

  readonly modalidades = signal<TeletrabajoCatalogo[]>([]);
  readonly trabajadores = signal<TeletrabajoTrabajadorItem[]>([]);
  readonly trabajadorSeleccionado = signal<TeletrabajoTrabajadorItem | null>(null);

  readonly meses = [
    { id: 1, nombre: 'Enero' },
    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },
    { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },
    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },
    { id: 12, nombre: 'Diciembre' },
  ];

  readonly form = this.fb.group({
    empleadoId: [null as number | null, Validators.required],
    filtroTrabajador: [''],
    mes: [new Date().getMonth() + 1, Validators.required],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]],
    modalidadId: [null as number | null, Validators.required],
    fechaReporte: [this.hoy(), Validators.required],
  });

  ngOnInit(): void {
    this.cargarModalidades();
  }

  cargarModalidades(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.teletrabajoApi.listarModalidades().subscribe({
      next: (modalidades) => {
        this.modalidades.set(modalidades ?? []);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando modalidades:', err);
        this.error.set('No se pudieron cargar las modalidades de teletrabajo.');
        this.cargando.set(false);
      },
    });
  }

  buscarTrabajadores(): void {
    const filtro = this.form.controls.filtroTrabajador.value?.trim() ?? '';

    if (filtro.length < 3) {
      this.error.set('Ingrese al menos 3 caracteres para buscar trabajador.');
      return;
    }

    this.buscandoTrabajador.set(true);
    this.error.set(null);

    this.teletrabajoApi.buscarTrabajadores(filtro).subscribe({
      next: (trabajadores) => {
        this.trabajadores.set(trabajadores ?? []);
        this.buscandoTrabajador.set(false);

        if (!trabajadores?.length) {
          this.error.set('No se encontraron trabajadores con el filtro ingresado.');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error buscando trabajadores:', err);
        this.error.set('No se pudo buscar trabajadores.');
        this.buscandoTrabajador.set(false);
      },
    });
  }

  seleccionarTrabajador(trabajador: TeletrabajoTrabajadorItem): void {
    const empleadoId = trabajador.empleadoId ?? trabajador.id;

    if (!empleadoId) {
      this.error.set('El trabajador seleccionado no tiene empleadoId.');
      return;
    }

    this.trabajadorSeleccionado.set(trabajador);
    this.form.controls.empleadoId.setValue(empleadoId);
    this.trabajadores.set([]);
    this.error.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();

    if (!raw.empleadoId || !raw.mes || !raw.anio || !raw.modalidadId || !raw.fechaReporte) {
      this.error.set('Complete los campos obligatorios.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.teletrabajoApi
      .crearCabecera({
        empleadoId: raw.empleadoId,
        mes: raw.mes,
        anio: raw.anio,
        modalidadId: raw.modalidadId,
        fechaReporte: raw.fechaReporte,
      })
      .subscribe({
        next: (reporteId) => {
          this.guardando.set(false);
          this.dialogRef.close(reporteId);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error creando cabecera de teletrabajo:', err);
          this.error.set('No se pudo crear el reporte de teletrabajo.');
          this.guardando.set(false);
        },
      });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  textoTrabajador(trabajador: TeletrabajoTrabajadorItem | null): string {
    if (!trabajador) {
      return '';
    }

    return (
      trabajador.nombreCompleto ||
      trabajador.trabajador ||
      `Empleado ID: ${trabajador.empleadoId ?? trabajador.id ?? '-'}`
    );
  }

  private hoy(): string {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }
}