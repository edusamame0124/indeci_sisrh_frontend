import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AdminApiService } from '../../services/admin-api.service';
import type { AdminPersonaLookup } from '../../models/admin.models';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { SISRH_SNACK_DURATION_MS } from '../../../../core/config/sisrh-snack.config';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength.component';
import {
  evaluatePasswordComplexity,
  passwordComplexityValidator,
  passwordsMatchValidator,
} from '../../../auth/models/password-policy.model';

const DNI_PE_PATTERN = /^\d{8}$/;

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
    MatIconModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    PasswordStrengthComponent,
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
          <mat-card-subtitle>
            Vincule el titular por DNI y defina la clave temporal; deberá cambiarla en el primer ingreso.
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="frm" (ngSubmit)="guardar()" novalidate>
            <section class="form-section" aria-labelledby="sec-titular">
              <h3 id="sec-titular">Titular (persona)</h3>
              <mat-form-field appearance="outline" class="full">
                <mat-label>DNI del titular</mat-label>
                <input
                  matInput
                  formControlName="dni"
                  maxlength="8"
                  inputmode="numeric"
                  autocomplete="off"
                  [matAutocomplete]="dniAuto"
                  (input)="onDniInput($event)"
                  aria-describedby="dni-hint"
                />
                @if (lookupLoading()) {
                  <mat-spinner matSuffix diameter="20" aria-hidden="true" />
                }
                <mat-autocomplete #dniAuto="matAutocomplete" (optionSelected)="onPersonaSelected($event)">
                  @for (p of personaOptions(); track p.personaId) {
                    <mat-option [value]="p.dni">
                      <span class="dni-opt">{{ p.dni }}</span>
                      <span class="nombre-opt">{{ p.nombreCompleto }}</span>
                      @if (p.codigoInterno) {
                        <span class="meta-opt">· {{ p.codigoInterno }}</span>
                      }
                    </mat-option>
                  }
                </mat-autocomplete>
                @if (form.controls.dni.touched && form.controls.dni.hasError('required')) {
                  <mat-error>El DNI es obligatorio.</mat-error>
                }
                @if (form.controls.dni.touched && form.controls.dni.hasError('pattern')) {
                  <mat-error>El DNI debe tener exactamente 8 dígitos numéricos.</mat-error>
                }
              </mat-form-field>

              <p id="dni-hint" class="page-hint">
                Busque por DNI o nombre. Si la persona no existe, se registrará con el DNI indicado.
              </p>

              @if (personaPreview(); as preview) {
                <div
                  class="persona-preview"
                  [class.persona-preview--blocked]="preview.cuentaVinculada"
                  role="status"
                  aria-live="polite"
                >
                  <p class="persona-preview__nombre">{{ preview.nombreCompleto }}</p>
                  <p class="persona-preview__meta">
                    DNI {{ preview.dni }}
                    @if (preview.codigoInterno) {
                      <span>· Código {{ preview.codigoInterno }}</span>
                    }
                    @if (preview.empleadoId) {
                      <span>· Empleado vinculado</span>
                    }
                  </p>
                  @if (preview.cuentaVinculada) {
                    <p class="persona-preview__alert">
                      Esta persona ya tiene cuenta
                      @if (preview.usernameVinculado) {
                        <strong>{{ preview.usernameVinculado }}</strong>
                      }.
                      No puede crear otra con el mismo DNI.
                    </p>
                  } @else {
                    <p class="persona-preview__ok">Persona disponible para vincular la nueva cuenta.</p>
                  }
                </div>
              } @else if (dniCompleto() && !lookupLoading()) {
                <p class="page-hint persona-preview__new" role="status">
                  No hay persona registrada con este DNI. Se creará el registro al guardar.
                </p>
              }
            </section>

            <section class="form-section" aria-labelledby="sec-datos-acceso">
              <h3 id="sec-datos-acceso">Datos de acceso</h3>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Nombre de usuario institucional</mat-label>
                <input matInput formControlName="username" maxlength="120" autocomplete="username" />
                @if (form.controls.username.touched && form.controls.username.invalid) {
                  <mat-error>Usuario requerido (3–120 caracteres alfanuméricos institucional).</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Contraseña temporal</mat-label>
                <input
                  matInput
                  [type]="passwordVisible() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="new-password"
                />
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  (click)="togglePasswordVisibility()"
                  [attr.aria-label]="passwordVisible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  [attr.aria-pressed]="passwordVisible()"
                >
                  <mat-icon [fontIcon]="passwordVisible() ? 'visibility_off' : 'visibility'" />
                </button>
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <mat-error>Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.</mat-error>
                }
              </mat-form-field>

              @if (showPasswordStrength()) {
                <app-password-strength [result]="complexityResult()" />
              }

              <mat-form-field appearance="outline" class="full">
                <mat-label>Confirmar contraseña temporal</mat-label>
                <input
                  matInput
                  [type]="confirmPasswordVisible() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                  [attr.aria-invalid]="passwordsMismatch()"
                />
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  (click)="toggleConfirmPasswordVisibility()"
                  [attr.aria-label]="
                    confirmPasswordVisible() ? 'Ocultar confirmación' : 'Mostrar confirmación'
                  "
                  [attr.aria-pressed]="confirmPasswordVisible()"
                >
                  <mat-icon [fontIcon]="confirmPasswordVisible() ? 'visibility_off' : 'visibility'" />
                </button>
                @if (passwordsMismatch()) {
                  <mat-error>Las contraseñas no coinciden.</mat-error>
                }
              </mat-form-field>

              <p class="page-hint">
                Comunique la clave temporal al usuario por un canal seguro. No se volverá a mostrar en pantalla.
              </p>
            </section>

            @if (saving()) {
              <p role="status" class="page-hint">Guardando…</p>
            }

            <div class="card-footer-actions">
              <a mat-button routerLink="/admin/usuarios" type="button">Cancelar</a>
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || saving() || cuentaVinculada()"
              >
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
        max-width: 560px;
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
      .dni-opt {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        margin-right: 0.5rem;
      }
      .nombre-opt {
        color: var(--sisrh-text-primary, inherit);
      }
      .meta-opt {
        color: var(--sisrh-text-muted, #5f6368);
        font-size: 0.875rem;
        margin-left: 0.25rem;
      }
      .persona-preview {
        border: 1px solid var(--sisrh-border-subtle, #e0e0e0);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        background: var(--sisrh-surface-muted, #f8f9fa);
      }
      .persona-preview--blocked {
        border-color: #c62828;
        background: #ffebee;
      }
      .persona-preview__nombre {
        margin: 0 0 0.25rem;
        font-weight: 600;
      }
      .persona-preview__meta {
        margin: 0;
        font-size: 0.875rem;
        color: var(--sisrh-text-muted, #5f6368);
      }
      .persona-preview__alert {
        margin: 0.5rem 0 0;
        color: #b71c1c;
        font-size: 0.875rem;
      }
      .persona-preview__ok {
        margin: 0.5rem 0 0;
        color: #2e7d32;
        font-size: 0.875rem;
      }
      .persona-preview__new {
        margin-top: 0;
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
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly lookupLoading = signal(false);
  readonly personaOptions = signal<readonly AdminPersonaLookup[]>([]);
  readonly personaPreview = signal<AdminPersonaLookup | null>(null);

  readonly form = this.fb.group(
    {
      dni: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(DNI_PE_PATTERN)],
      }),
      username: this.fb.control('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(120),
          Validators.pattern(/^[A-Za-z0-9_.@-]+$/),
        ],
      }),
      password: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, passwordComplexityValidator()],
      }),
      confirmPassword: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsMatchValidator('password', 'confirmPassword') },
  );

  private readonly dniValue = toSignal(
    this.form.controls.dni.valueChanges.pipe(startWith(this.form.controls.dni.value)),
    { initialValue: '' },
  );

  readonly dniCompleto = computed(() => DNI_PE_PATTERN.test(this.dniValue() ?? ''));

  readonly cuentaVinculada = computed(() => this.personaPreview()?.cuentaVinculada === true);

  private readonly passwordValue = toSignal(
    this.form.controls.password.valueChanges.pipe(
      startWith(this.form.controls.password.value),
    ),
    { initialValue: '' },
  );

  readonly showPasswordStrength = computed(
    () => (this.passwordValue()?.length ?? 0) > 0,
  );

  readonly complexityResult = computed(() =>
    evaluatePasswordComplexity(this.passwordValue() ?? ''),
  );

  readonly passwordsMismatch = computed(
    () =>
      this.form.controls.confirmPassword.touched &&
      this.form.hasError('passwordsMismatch'),
  );

  constructor() {
    this.form.controls.dni.valueChanges
      .pipe(
        startWith(this.form.controls.dni.value),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          const q = this.form.controls.dni.value.trim();
          if (q.length < 2) {
            this.personaOptions.set([]);
            this.personaPreview.set(null);
            this.lookupLoading.set(false);
          } else {
            this.lookupLoading.set(true);
          }
        }),
        switchMap((q) => {
          const trimmed = q.trim();
          if (trimmed.length < 2) {
            return of([] as readonly AdminPersonaLookup[]);
          }
          return this.api.lookupPersonas(trimmed).pipe(
            catchError(() => of([] as readonly AdminPersonaLookup[])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => {
        this.personaOptions.set(options);
        this.lookupLoading.set(false);
        this.syncPreviewFromOptions(options);
      });
  }

  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9]/g, '').slice(0, 8);
    if (input.value !== clean) {
      input.value = clean;
      this.form.controls.dni.setValue(clean, { emitEvent: true });
    }
  }

  onPersonaSelected(event: MatAutocompleteSelectedEvent): void {
    const dni = String(event.option.value ?? '');
    const persona = this.personaOptions().find((p) => p.dni === dni) ?? null;
    this.form.controls.dni.setValue(dni, { emitEvent: false });
    this.personaPreview.set(persona);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  guardar(): void {
    if (this.form.invalid || this.saving() || this.cuentaVinculada()) return;
    this.saving.set(true);
    const username = this.form.controls.username.value.trim();
    const password = this.form.controls.password.value;
    const dni = this.form.controls.dni.value;
    this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_CREATE' } });
    this.api.createUser({ username, password, dni }).subscribe({
      next: (u) => {
        this.saving.set(false);
        this.form.controls.password.reset('');
        this.form.controls.confirmPassword.reset('');
        this.snack.open(this.errors.adminUsuarioCreadoClaveTemporalOk(), 'Cerrar', {
          duration: SISRH_SNACK_DURATION_MS.short,
        });
        void this.router.navigate(['/admin/usuarios', u.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw), 'Cerrar', {
          duration: SISRH_SNACK_DURATION_MS.long,
        });
      },
    });
  }

  private syncPreviewFromOptions(options: readonly AdminPersonaLookup[]): void {
    const dni = this.form.controls.dni.value;
    if (!DNI_PE_PATTERN.test(dni)) {
      this.personaPreview.set(null);
      return;
    }
    const exact = options.find((p) => p.dni === dni);
    this.personaPreview.set(exact ?? null);
  }
}
