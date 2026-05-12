import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AdminApiService, type PermisoDeniedRow } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import type { AdminPermisoRow, AdminRolRow } from '../../models/admin.models';

@Component({
  selector: 'app-admin-user-edit-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!userIdOk()) {
      <mat-card class="card">
        <mat-card-content><p role="alert">Identificador de usuario inválido.</p></mat-card-content>
      </mat-card>
    } @else if (loading()) {
      <div class="spin" aria-busy="true">
        <mat-progress-spinner mode="indeterminate" diameter="56" aria-label="Cargando usuario" />
      </div>
    } @else {
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Usuario {{ headline() }}</mat-card-title>
          <mat-card-subtitle>Gestionar estado, roles, denegaciones y reinicio de clave institucional</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="stack">
          <section aria-labelledby="st-estado">
            <h3 id="st-estado">Estado de cuenta</h3>
            <form [formGroup]="statusForm" class="inline" (ngSubmit)="guardarEstado()" novalidate>
              <mat-form-field appearance="outline">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="ACTIVE">Activo</mat-option>
                  <mat-option value="INACTIVE">Inactivo</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" [disabled]="savingEstado() || statusForm.invalid">
                Guardar estado
              </button>
            </form>
          </section>

          <section aria-labelledby="st-roles">
            <h3 id="st-roles">Roles asignados</h3>
            <form [formGroup]="rolesForm" class="stack" (ngSubmit)="guardarRoles()" novalidate>
              <mat-form-field appearance="outline">
                <mat-label>Roles</mat-label>
                <mat-select formControlName="roleIds" multiple>
                  @for (r of rolesCat(); track r.id) {
                    <mat-option [value]="r.id">{{ r.codigo }} — {{ r.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="acts">
                <button mat-flat-button color="primary" type="submit" [disabled]="savingRoles() || rolesForm.invalid">
                  Guardar roles
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="st-deny">
            <h3 id="st-deny">Denegaciones explícitas de permiso</h3>
            <p class="hint">
              Lista anulaciones directas sobre el modelo UsuarioPermisoDeny según servidor.
            </p>
            <form [formGroup]="deniesForm" class="stack" (ngSubmit)="guardarDenegaciones()" novalidate>
              <mat-form-field appearance="outline">
                <mat-label>Permisos denegados</mat-label>
                <mat-select formControlName="permisoIds" multiple>
                  @for (p of permisosCat(); track p.id) {
                    <mat-option [value]="p.id">{{ p.codigo }} — {{ p.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="acts">
                <button mat-flat-button color="primary" type="submit" [disabled]="savingDenies()">
                  Guardar denegaciones
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="st-reset">
            <h3 id="st-reset">Reinicio institucional de clave</h3>
            <p class="hint">
              No se muestra contraseña. Solo marca en servidor la obligación del usuario de definir nueva clave.
            </p>
            <button mat-stroked-button type="button" color="warn" (click)="abrirConfirmReset()" [disabled]="resetting()">
              Marcar nueva clave requerida
            </button>
          </section>

          <div class="footer-act">
            <a mat-button routerLink="/admin/usuarios" type="button">Volver al listado</a>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [
    `
      .card {
        margin: 1rem;
      }
      .stack {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        margin-top: 0.5rem;
      }
      .inline {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
      }
      .hint {
        color: #64748b;
        font-size: 0.875rem;
      }
      .acts {
        display: flex;
        justify-content: flex-start;
      }
      .footer-act {
        margin-top: 1rem;
        border-top: 1px solid #e2e8f0;
        padding-top: 1rem;
      }
      .spin {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }
    `,
  ],
})
export class AdminUserEditPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly dialogs = inject(MatDialog);
  private readonly telemetry = inject(ClientTelemetryService);

  private readonly parsedId = Number(this.route.snapshot.paramMap.get('id'));
  readonly userIdOk = signal(!Number.isNaN(this.parsedId) && this.parsedId > 0);

  readonly loading = signal(true);
  readonly headline = signal('');

  readonly rolesCat = signal<readonly AdminRolRow[]>([]);
  readonly permisosCat = signal<readonly AdminPermisoRow[]>([]);

  readonly savingEstado = signal(false);
  readonly savingRoles = signal(false);
  readonly savingDenies = signal(false);
  readonly resetting = signal(false);

  readonly statusForm = this.fb.group({
    status: this.fb.nonNullable.control<'ACTIVE' | 'INACTIVE'>('ACTIVE', {
      validators: [Validators.required],
    }),
  });

  readonly rolesForm = this.fb.group({
    roleIds: this.fb.nonNullable.control<number[]>([]),
  });

  readonly deniesForm = this.fb.group({
    permisoIds: this.fb.nonNullable.control<number[]>([]),
  });

  constructor() {
    const idOk = this.userIdOk();
    if (!idOk) return;
    this.bootstrap(this.parsedId);
  }

  private bootstrap(userId: number): void {
    this.telemetry.track('ADMIN_MODULE_UI', {
      extra: { action: 'USER_EDIT_BOOTSTRAP', userId },
    });

    forkJoin({
      usuario: this.api.getUser(userId),
      roles: this.api.listRoles(),
      permisos: this.api.listPermisos(),
      deniesExtra: this.api
        .listUserDeniedPermissions(userId)
        .pipe(catchError(() => of<readonly PermisoDeniedRow[]>([]))),
    }).subscribe({
      next: ({ usuario, roles, permisos, deniesExtra }) => {
        this.headline.set(usuario.username);
        const estado = usuario.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
        this.statusForm.patchValue({ status: estado });

        this.rolesCat.set(roles);
        this.permisosCat.set(permisos);

        const fromDetail = usuario.deniedPermissionIds ?? [];
        const fromRows = deniesExtra.map((d) => d.permisoId);
        const deniedUniq = [...new Set<number>([...fromDetail, ...fromRows])];
        this.deniesForm.patchValue({ permisoIds: deniedUniq });

        const assigned = usuario.assignedRoleIds ?? [];
        this.rolesForm.patchValue({ roleIds: [...assigned] });

        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
        this.loading.set(false);
      },
    });
  }

  guardarEstado(): void {
    if (!this.userIdOk()) return;
    this.savingEstado.set(true);
    const status = this.statusForm.controls.status.value;
    this.api.patchUserStatus(this.parsedId, { status }).subscribe({
      next: () => {
        this.savingEstado.set(false);
        this.snack.open(this.errors.adminUsuarioEstadoActualizadoLista());
        this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_STATUS_SAVE' } });
      },
      error: (err: HttpErrorResponse) => {
        this.savingEstado.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }

  guardarRoles(): void {
    if (!this.userIdOk()) return;
    this.savingRoles.set(true);
    const roleIds = this.rolesForm.controls.roleIds.value.map((id) => id);
    this.api.putUserRoles(this.parsedId, { roleIds }).subscribe({
      next: () => {
        this.savingRoles.set(false);
        this.snack.open(this.errors.adminUsuarioRolesActualizadosLista());
        this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_ROLES_SAVE' } });
      },
      error: (err: HttpErrorResponse) => {
        this.savingRoles.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }

  guardarDenegaciones(): void {
    if (!this.userIdOk()) return;
    this.savingDenies.set(true);
    const permisoIds = this.deniesForm.controls.permisoIds.value.map((id) => id);
    this.api.putUserDeniedPermissions(this.parsedId, { permisoIds }).subscribe({
      next: () => {
        this.savingDenies.set(false);
        this.snack.open(this.errors.adminUsuarioDenegacionesLista());
        this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_DENIES_SAVE' } });
      },
      error: (err: HttpErrorResponse) => {
        this.savingDenies.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.snack.open(this.errors.translateAdminApi(raw));
      },
    });
  }

  abrirConfirmReset(): void {
    if (!this.userIdOk()) return;
    const ref = this.dialogs.open(ConfirmDialogComponent, {
      data: {
        title: 'Reinicio de clave institucional',
        message:
          'Se marcará al usuario para cambiar contraseña al próximo acceso institucional. No se muestra ni copia ninguna contraseña en pantalla.',
        cancelLabel: 'Cancelar',
        confirmLabel: 'Confirmar marca',
      } satisfies ConfirmDialogData,
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok || !this.userIdOk()) return;
      this.resetting.set(true);
      this.api.resetUserPassword(this.parsedId).subscribe({
        next: () => {
          this.resetting.set(false);
          this.snack.open(this.errors.adminResetClaveMarcadoOk());
          this.telemetry.track('ADMIN_MODULE_UI', {
            extra: { action: 'USER_RESET_MARKED' },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.resetting.set(false);
          const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
          this.snack.open(this.errors.translateAdminApi(raw));
        },
      });
    });
  }
}
