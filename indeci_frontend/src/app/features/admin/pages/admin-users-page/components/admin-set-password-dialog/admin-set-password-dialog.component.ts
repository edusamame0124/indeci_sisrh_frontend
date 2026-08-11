import { ChangeDetectionStrategy, Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';

import { PasswordStrengthComponent } from '../../../../../../shared/components/password-strength/password-strength.component';
import {
  PasswordComplexityResult,
  evaluatePasswordComplexity,
  passwordComplexityValidator,
  passwordsMatchValidator,
} from '../../../../../auth/models/password-policy.model';
import { AdminApiService } from '../../../../services/admin-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';

export interface AdminSetPasswordDialogData {
  readonly userId: number;
  readonly username: string;
  readonly nombreCompleto?: string | null;
}

/**
 * Soporte de mesa de ayuda (SUPER_ADMIN) — define una clave temporal para un
 * empleado que ya no recuerda la suya. A diferencia del formulario de Mi Perfil
 * NO pide "clave actual" (el admin no la conoce); reutiliza el mismo validador
 * de complejidad y el mismo medidor de fortaleza.
 */
@Component({
  selector: 'app-admin-set-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PasswordStrengthComponent,
  ],
  templateUrl: './admin-set-password-dialog.component.html',
  styleUrl: './admin-set-password-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSetPasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly toastr = inject(ToastrService);

  readonly enviando = signal(false);
  readonly errorMensaje = signal('');
  readonly nuevaClaveVisible = signal(false);
  readonly confirmarClaveVisible = signal(false);
  readonly complexityResult = signal<PasswordComplexityResult | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      claveNueva: ['', [Validators.required, passwordComplexityValidator()]],
      claveConfirmar: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('claveNueva', 'claveConfirmar') },
  );

  constructor(
    private readonly dialogRef: MatDialogRef<AdminSetPasswordDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: AdminSetPasswordDialogData,
  ) {
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

  toggleNuevaClaveVisible(): void {
    this.nuevaClaveVisible.update((v) => !v);
  }

  toggleConfirmarClaveVisible(): void {
    this.confirmarClaveVisible.update((v) => !v);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) {
      return;
    }

    const { claveNueva } = this.form.getRawValue();
    this.errorMensaje.set('');
    this.enviando.set(true);

    this.api
      .setUserPassword(this.data.userId, { claveNueva })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.toastr.success(
            `Deberá definir una nueva al ingresar.`,
            `Clave temporal asignada a ${this.data.username}`,
          );
          this.dialogRef.close(true);
        },
        error: (error: HttpErrorResponse) => this.manejarError(error),
      });
  }

  private manejarError(error: HttpErrorResponse): void {
    const raw = isErrorResponse(error.error) ? error.error.mensaje : null;
    this.errorMensaje.set(this.errorMessages.translateAdminApi(raw));
  }
}
