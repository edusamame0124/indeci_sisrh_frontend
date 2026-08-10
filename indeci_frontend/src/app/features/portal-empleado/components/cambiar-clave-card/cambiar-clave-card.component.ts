import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength.component';
import {
  PasswordComplexityResult,
  evaluatePasswordComplexity,
  passwordComplexityValidator,
  passwordsMatchValidator,
} from '../../../auth/models/password-policy.model';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';

/**
 * Autoservicio — cambio de contraseña voluntario del empleado desde Mi Perfil.
 * A diferencia de la pantalla de clave forzada (US3), esta SIEMPRE pide la
 * contraseña actual y vive colapsada por defecto (candado + botón).
 */
@Component({
  selector: 'app-cambiar-clave-card',
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
    PasswordStrengthComponent,
  ],
  templateUrl: './cambiar-clave-card.component.html',
  styleUrl: './cambiar-clave-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarClaveCardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly notificacion = inject(NotificacionService);

  readonly expandido = signal(false);
  readonly enviando = signal(false);
  readonly errorMensaje = signal('');
  readonly claveActualVisible = signal(false);
  readonly nuevaClaveVisible = signal(false);
  readonly confirmarClaveVisible = signal(false);
  readonly complexityResult = signal<PasswordComplexityResult | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      claveActual: ['', [Validators.required]],
      claveNueva: ['', [Validators.required, passwordComplexityValidator()]],
      claveConfirmar: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('claveNueva', 'claveConfirmar') },
  );

  constructor() {
    this.form.controls.claveNueva.valueChanges.subscribe((valor) => {
      this.complexityResult.set(valor ? evaluatePasswordComplexity(valor) : null);
    });
  }

  passwordsMismatch(): boolean {
    return (
      this.form.errors?.['passwordsMismatch'] === true &&
      (this.form.controls.claveConfirmar.touched ?? false)
    );
  }

  activar(): void {
    this.expandido.set(true);
  }

  cancelar(): void {
    this.form.reset({ claveActual: '', claveNueva: '', claveConfirmar: '' });
    this.complexityResult.set(null);
    this.errorMensaje.set('');
    this.expandido.set(false);
  }

  toggleClaveActualVisible(): void {
    this.claveActualVisible.update((v) => !v);
  }

  toggleNuevaClaveVisible(): void {
    this.nuevaClaveVisible.update((v) => !v);
  }

  toggleConfirmarClaveVisible(): void {
    this.confirmarClaveVisible.update((v) => !v);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) {
      return;
    }

    const { claveActual, claveNueva } = this.form.getRawValue();
    this.errorMensaje.set('');
    this.enviando.set(true);

    this.personaApi
      .cambiarMiClave({ claveActual, claveNueva })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.cancelar();
          this.notificacion.exito(
            'Se cerraron tus demás sesiones activas por seguridad.',
            'Contraseña actualizada',
          );
        },
        error: (error: HttpErrorResponse) => this.manejarError(error),
      });
  }

  private manejarError(error: HttpErrorResponse): void {
    const body = error.error;
    if (isErrorResponse(body)) {
      this.errorMensaje.set(this.errorMessages.translate(body.mensaje));
      return;
    }
    this.errorMensaje.set(this.errorMessages.translate(null));
  }
}
