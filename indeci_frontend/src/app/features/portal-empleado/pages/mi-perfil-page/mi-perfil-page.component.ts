import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import type {
  MiPerfilUpdateInput,
  PersonaEmpleado,
} from '../../../../features/empleados/models/persona-empleado.model';
import { PersonaApiService } from '../../../../features/empleados/services/persona-api.service';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './mi-perfil-page.component.html',
  styleUrl: './mi-perfil-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfilPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly perfil = signal<PersonaEmpleado | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly modoEdicion = signal(false);
  readonly error = signal<string | null>(null);
  readonly fotoUrl = signal<string | null>(null);
  readonly subiendoFoto = signal(false);
  readonly errorFoto = signal<string | null>(null);
  readonly formulario = this.fb.nonNullable.group({
    telefono: ['', [Validators.pattern(/^[0-9]{7,15}$/), Validators.maxLength(15)]],
    correoPersonal: ['', [Validators.email, Validators.maxLength(150)]],
    direccion: ['', [Validators.maxLength(300)]],
    contactoEmergenciaNombre: ['', [Validators.maxLength(150)]],
    contactoEmergenciaParentesco: ['', [Validators.maxLength(50)]],
    contactoEmergenciaTelefono: [
      '',
      [Validators.pattern(/^[0-9]{7,15}$/), Validators.maxLength(15)],
    ],
  });

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.personaApi
      .obtenerMiPerfil()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.cargarFormulario(perfil);
          this.formulario.disable();
          this.cargarFoto();
        },
        error: (error: unknown) => {
          console.error('Error al cargar el perfil', error);
          this.error.set('No se pudo obtener la información del perfil.');
        },
      });
  }

  activarEdicion(): void {
    this.modoEdicion.set(true);
    this.formulario.enable();
  }

  cancelarEdicion(): void {
    const perfilActual = this.perfil();

    if (perfilActual) {
      this.cargarFormulario(perfilActual);
    }

    this.formulario.disable();
    this.modoEdicion.set(false);
  }

  guardarCambios(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();

    const body: MiPerfilUpdateInput = {
      telefono: this.limpiar(valores.telefono),
      correoPersonal: this.limpiar(valores.correoPersonal),
      direccion: this.limpiar(valores.direccion),
      contactoEmergenciaNombre: this.limpiar(valores.contactoEmergenciaNombre),
      contactoEmergenciaParentesco: this.limpiar(valores.contactoEmergenciaParentesco),
      contactoEmergenciaTelefono: this.limpiar(valores.contactoEmergenciaTelefono),
    };

    this.guardando.set(true);

    this.personaApi
      .actualizarMiPerfil(body)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (perfilActualizado) => {
          this.perfil.set(perfilActualizado);
          this.cargarFormulario(perfilActualizado);
          this.formulario.disable();
          this.modoEdicion.set(false);

          this.snackBar.open('Perfil actualizado correctamente.', 'Cerrar', {
            duration: 3500,
          });
        },
        error: (error: unknown) => {
          console.error('Error al actualizar el perfil', error);

          this.snackBar.open('No se pudo actualizar el perfil.', 'Cerrar', {
            duration: 4500,
          });
        },
      });
  }

  private cargarFormulario(perfil: PersonaEmpleado): void {
    this.formulario.reset({
      telefono: perfil.telefono ?? '',
      correoPersonal: perfil.email ?? '',
      direccion: perfil.direccion ?? '',
      contactoEmergenciaNombre: perfil.contactoEmergenciaNombre ?? '',
      contactoEmergenciaParentesco: perfil.contactoEmergenciaParentesco ?? '',
      contactoEmergenciaTelefono: perfil.contactoEmergenciaTelefono ?? '',
    });
  }

  private limpiar(valor: string): string | null {
    const texto = valor.trim();
    return texto.length > 0 ? texto : null;
  }
  cargarFoto(): void {
    this.errorFoto.set(null);

    this.personaApi.obtenerFotoMiPerfil().subscribe({
      next: (blob) => {
        const urlAnterior = this.fotoUrl();

        if (urlAnterior) {
          URL.revokeObjectURL(urlAnterior);
        }

        const nuevaUrl = URL.createObjectURL(blob);
        this.fotoUrl.set(nuevaUrl);
      },
      error: (error: unknown) => {
        console.error('Error al cargar la foto', error);
        this.fotoUrl.set(null);
      },
    });
  }
  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png'];

    if (!tiposPermitidos.includes(file.type)) {
      this.snackBar.open('Solo se permiten imágenes JPG o PNG.', 'Cerrar', {
        duration: 4000,
      });

      input.value = '';
      return;
    }

    const maximoBytes = 2 * 1024 * 1024;

    if (file.size > maximoBytes) {
      this.snackBar.open('La imagen no debe superar los 2 MB.', 'Cerrar', {
        duration: 4000,
      });

      input.value = '';
      return;
    }

    this.subirFoto(file, input);
  }
  private subirFoto(file: File, input: HTMLInputElement): void {
    this.subiendoFoto.set(true);
    this.errorFoto.set(null);

    this.personaApi
      .actualizarFotoMiPerfil(file)
      .pipe(
        finalize(() => {
          this.subiendoFoto.set(false);
          input.value = '';
        }),
      )
      .subscribe({
        next: () => {
          this.cargarFoto();

          this.snackBar.open('Foto de perfil actualizada correctamente.', 'Cerrar', {
            duration: 3500,
          });
        },
        error: (error: unknown) => {
          console.error('Error al actualizar la foto', error);

          this.errorFoto.set('No se pudo actualizar la fotografía.');

          this.snackBar.open('No se pudo actualizar la fotografía.', 'Cerrar', {
            duration: 4500,
          });
        },
      });
  }
}
