import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';

@Component({
  selector: 'app-admin-user-new-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__group">Administración</span>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/admin/usuarios">Usuarios</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Nuevo usuario</span>
      </nav>

      <mat-card class="page-card sisrh-elevated user-form-card">
        <mat-card-header>
          <mat-card-title>Nuevo usuario</mat-card-title>
          <mat-card-subtitle>Alta inicial (credenciales según servidor y NEW_CLAVE)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="frm" (ngSubmit)="guardar()" novalidate>
            <section class="form-section" aria-labelledby="sec-datos-acceso">
              <h3 id="sec-datos-acceso">Datos de acceso</h3>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Nombre de usuario institucional</mat-label>
                <input matInput formControlName="username" maxlength="120" autocomplete="username" />
                @if (form.controls.username.touched && form.controls.username.invalid) {
                  <mat-error>Usuario requerido (3–120 caracteres alfanuméricos institucional).</mat-error>
                }
              </mat-form-field>
            </section>

            @if (saving()) {
              <p role="status" class="page-hint">Guardando…</p>
            }

            <div class="card-footer-actions">
              <a mat-button routerLink="/admin/usuarios" type="button">Cancelar</a>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                Registrar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .user-form-card {
        max-width: 520px;
      }
      .frm {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class AdminUserNewPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    username: this.fb.control('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(120),
        Validators.pattern(/^[A-Za-z0-9_.@-]+$/),
      ],
    }),
  });

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const username = this.form.controls.username.value.trim();
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_CREATE' } });
    this.api.createUser({ username }).subscribe({
      next: (u) => {
        this.saving.set(false);
        void this.router.navigate(['/admin/usuarios', u.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }
}
