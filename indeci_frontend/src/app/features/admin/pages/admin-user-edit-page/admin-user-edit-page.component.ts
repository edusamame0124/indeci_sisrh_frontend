import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AdminApiService } from '../../services/admin-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { AuthService } from '../../../../core/services/auth.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import {
  SISRH_SNACK_DURATION_MS,
  type SisrhSnackDurationMs,
} from '../../../../core/config/sisrh-snack.config';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SistemaAreaPickerComponent } from '../../components/sistema-area-picker/sistema-area-picker.component';
import type {
  AccesoSistema,
  AdminPermisoRow,
  AdminRolRow,
  SistemaAdmin,
  SistemaArea,
  SistemaRol,
} from '../../models/admin.models';

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
    MatSlideToggleModule,
    SistemaAreaPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      @if (!userIdOk()) {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-content>
            <p class="empty error" role="alert">Identificador de usuario inválido.</p>
          </mat-card-content>
        </mat-card>
      } @else if (loading()) {
        <div class="page-loading" aria-busy="true">
          <mat-progress-spinner mode="indeterminate" diameter="56" aria-label="Cargando usuario" />
        </div>
      } @else {
        <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
          <a mat-button routerLink="/">Inicio</a>
          <span class="crumbs__sep" aria-hidden="true">/</span>
          <span class="crumbs__group">Administración</span>
          <span class="crumbs__sep" aria-hidden="true">/</span>
          <a mat-button routerLink="/admin/usuarios">Usuarios</a>
          <span class="crumbs__sep" aria-hidden="true">/</span>
          <span class="crumbs__here">{{ headline() }}</span>
        </nav>

        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>Usuario {{ headline() }}</mat-card-title>
            <mat-card-subtitle>Gestionar estado, roles y reinicio de clave institucional</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stack">
          <section class="form-section" aria-labelledby="st-estado">
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

          <section class="form-section" aria-labelledby="st-accesos">
            <h3 id="st-accesos">Accesos por sistema</h3>
            <p class="page-hint">
              Los accesos a SISRH aplican de inmediato. Los cambios a Convocatoria y
              Rendimiento se aplican al siguiente ingreso del usuario.
            </p>

            <div class="access-stack">
              <!-- Sistema anfitrión: SISRH. El acceso se gobierna por roles internos,
                   no por un toggle (siempre se opera desde dentro de SISRH). -->
              <div class="access-row access-row--host">
                <div class="access-row__head">
                  <div>
                    <strong>SISRH</strong>
                    <p>Sistema integrador de RRHH y planillas. El acceso lo definen los roles asignados.</p>
                  </div>
                  <span class="access-badge" aria-hidden="true">Sistema actual</span>
                </div>

                <form [formGroup]="rolesForm" class="stack" (ngSubmit)="guardarRoles()" novalidate>
                  <mat-form-field appearance="outline">
                    <mat-label>Roles SISRH</mat-label>
                    <mat-select formControlName="roleIds" multiple>
                      @for (r of rolesCat(); track r.id) {
                        <mat-option [value]="r.id">{{ r.codigo }} — {{ r.nombre }}</mat-option>
                      }
                    </mat-select>
                    <mat-hint>El usuario heredará automáticamente los permisos de los roles seleccionados.</mat-hint>
                  </mat-form-field>
                  <div class="acts">
                    <button mat-flat-button color="primary" type="submit" [disabled]="savingRoles() || rolesForm.invalid">
                      Guardar roles
                    </button>
                  </div>
                </form>

                <div class="perm-block">
                  <span class="perm-block__title">Permisos heredados de los roles</span>
                  @if (loadingPermisos()) {
                    <p class="page-hint">Cargando permisos...</p>
                  } @else if (permisosDelRol().length === 0) {
                    <p class="perm-empty">Sin rol asignado o el rol no tiene permisos configurados.</p>
                  } @else {
                    <div class="perm-grupos">
                      @for (g of gruposPermiso(); track g.grupo) {
                        <div class="perm-grupo">
                          <span class="perm-grupo__label">{{ g.grupo }}</span>
                          <div class="perm-chips">
                            @for (p of g.permisos; track p.id) {
                              <span class="perm-chip" [title]="p.nombre">{{ p.codigo }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              @if (canManageAccesos()) {
                @for (sistema of sistemasExternos(); track sistema.codigo) {
                  <div class="access-row">
                    <div class="access-row__head">
                      <div>
                        <strong>{{ sistema.nombre }}</strong>
                        <p>{{ sistema.descripcion || 'Sistema externo integrado al SSO' }}</p>
                      </div>
                      <mat-slide-toggle
                        [checked]="isAccesoActivo(sistema.codigo)"
                        (change)="onToggleAcceso(sistema.codigo, $event.checked)"
                      >
                        Tiene acceso
                      </mat-slide-toggle>
                    </div>

                    @if (areasDeSistema(sistema.codigo).length > 0) {
                      <app-sistema-area-picker
                        [areas]="areasDeSistema(sistema.codigo)"
                        [selected]="areaSeleccionada(sistema.codigo)"
                        [disabled]="!isAccesoActivo(sistema.codigo)"
                        [label]="areaLabel(sistema.codigo)"
                        (areaChange)="onAreaAcceso(sistema.codigo, $event)"
                      />
                    }

                    <mat-form-field appearance="outline">
                      <mat-label>Roles en {{ sistema.nombre }}</mat-label>
                      <mat-select
                        multiple
                        [value]="rolesSeleccionados(sistema.codigo)"
                        [disabled]="!isAccesoActivo(sistema.codigo)"
                        (selectionChange)="onRolesAcceso(sistema.codigo, $event.value)"
                      >
                        @for (rol of rolesDeSistema(sistema.codigo); track rol.codigo) {
                          <mat-option [value]="rol.codigo">{{ rol.nombre }} — {{ rol.codigo }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                }
              }
            </div>

            @if (canManageAccesos()) {
              @if (accesosInvalidos()) {
                <p class="page-hint access-hint-error" role="alert">
                  Para cada sistema con acceso activo, seleccione la oficina (si aplica) y al menos un rol.
                </p>
              }

              <div class="acts">
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="guardarAccesos()"
                  [disabled]="savingAccesos() || accesosInvalidos()"
                >
                  Guardar accesos
                </button>
              </div>
            }
          </section>

          <section class="form-section" aria-labelledby="st-reset">
            <h3 id="st-reset">Reinicio institucional de clave</h3>
            <p class="page-hint">
              No se muestra contraseña. Solo marca en servidor la obligación del usuario de definir nueva clave.
            </p>
            <button mat-stroked-button type="button" color="warn" (click)="abrirConfirmReset()" [disabled]="resetting()">
              Marcar nueva clave requerida
            </button>
          </section>

          <div class="card-footer-actions">
            <a mat-button routerLink="/admin/usuarios" type="button">Volver al listado</a>
          </div>
        </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .stack {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-top: 0.5rem;
      }
      .inline {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
      }
      .acts {
        display: flex;
        justify-content: flex-start;
      }
      .access-stack {
        display: grid;
        gap: 1rem;
      }
      .access-row {
        border: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-radius: 8px;
        padding: 1rem;
        background: #fff;
      }
      /* Tarjeta del sistema anfitrión: acento institucional sutil para
         distinguirla de los sistemas externos, sin ruido visual. */
      .access-row--host {
        border-color: var(--sisrh-primary-100, #e8eef6);
        border-left: 3px solid var(--sisrh-primary, #1f3a5f);
        background: var(--sisrh-surface-muted, #f8fafc);
      }
      .access-badge {
        align-self: flex-start;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--sisrh-primary, #1f3a5f);
        background: var(--sisrh-primary-100, #e8eef6);
        border: 1px solid var(--sisrh-border-soft, #e7ecf2);
        white-space: nowrap;
      }
      .perm-block {
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--sisrh-border-soft, #e7ecf2);
      }
      .perm-block__title {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--sisrh-text-muted, #64748b);
        margin-bottom: 0.5rem;
      }
      .access-row__head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: 0.75rem;
      }
      .access-row__head p {
        margin: 0.25rem 0 0;
        color: var(--sisrh-color-muted, #64748b);
        font-size: 0.875rem;
      }
      .access-row mat-form-field {
        width: 100%;
      }
      .access-hint-error {
        color: var(--sisrh-color-error, #b71c1c);
        font-weight: 500;
      }
      .perm-grupos {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.5rem;
      }
      .perm-grupo {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .perm-grupo__label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--sisrh-text-muted, #64748b);
        min-width: 100px;
        padding-top: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .perm-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
      }
      .perm-chip {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        font-family: monospace;
        background: var(--sisrh-primary-100, #e8eef6);
        color: var(--sisrh-primary, #1f3a5f);
        border: 1px solid var(--sisrh-border-soft, #e7ecf2);
        cursor: default;
        user-select: none;
      }
      .perm-empty {
        font-size: 0.875rem;
        color: var(--sisrh-text-muted, #64748b);
        font-style: italic;
        margin: 0.5rem 0;
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
  private readonly auth = inject(AuthService);

  private readonly parsedId = Number(this.route.snapshot.paramMap.get('id'));
  readonly userIdOk = signal(!Number.isNaN(this.parsedId) && this.parsedId > 0);

  readonly loading = signal(true);
  readonly headline = signal('');

  readonly rolesCat = signal<readonly AdminRolRow[]>([]);
  readonly sistemasCat = signal<readonly SistemaAdmin[]>([]);
  readonly accesos = signal<readonly AccesoSistema[]>([]);
  readonly rolesSistema = signal<Readonly<Record<string, readonly SistemaRol[]>>>({});
  readonly areasSistema = signal<Readonly<Record<string, readonly SistemaArea[]>>>({});
  readonly permisosDelRol = signal<readonly AdminPermisoRow[]>([]);
  readonly loadingPermisos = signal(false);

  readonly gruposPermiso = computed(() => {
    const map = new Map<string, AdminPermisoRow[]>();
    for (const p of this.permisosDelRol()) {
      const grupo = this.grupoDePermiso(p.codigo);
      if (!map.has(grupo)) map.set(grupo, []);
      map.get(grupo)!.push(p);
    }
    return [...map.entries()].map(([grupo, permisos]) => ({ grupo, permisos }));
  });

  readonly savingEstado = signal(false);
  readonly savingRoles = signal(false);
  readonly savingAccesos = signal(false);
  readonly resetting = signal(false);
  // Gestión de «Accesos por sistema» (SISRH + sistemas externos SSO). Se gobierna
  // por el permiso ADM_USERS —que GESTOR_USUARIOS también posee— y no por el rol
  // SUPER_ADMIN, que en backend salta los guards por bypass (ROLE_SUPER_ADMIN) y
  // puede no traer el permiso explícito en el JWT: por eso se mantiene como fallback.
  readonly canManageAccesos = computed(
    () => this.auth.permisos().includes('ADM_USERS') || this.auth.roles().includes('SUPER_ADMIN'),
  );
  readonly sistemasExternos = computed(() =>
    this.sistemasCat().filter((s) => s.codigo !== 'sisrh'),
  );

  /**
   * Bloquea «Guardar accesos» si algún sistema con acceso activo no cumple:
   * al menos un rol y, cuando el sistema tiene catálogo de oficinas, una elegida.
   */
  readonly accesosInvalidos = computed(() => {
    for (const sistema of this.sistemasExternos()) {
      if (!this.isAccesoActivo(sistema.codigo)) continue;
      if (this.rolesSeleccionados(sistema.codigo).length === 0) return true;
      if (
        this.areasDeSistema(sistema.codigo).length > 0 &&
        !this.areaSeleccionada(sistema.codigo)
      ) {
        return true;
      }
    }
    return false;
  });

  readonly statusForm = this.fb.group({
    status: this.fb.nonNullable.control<'ACTIVE' | 'INACTIVE'>('ACTIVE', {
      validators: [Validators.required],
    }),
  });

  readonly rolesForm = this.fb.group({
    roleIds: this.fb.nonNullable.control<number[]>([]),
  });

  private rolesSub?: Subscription;
  private permisosLoadSeq = 0;

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
      sistemas: this.canManageAccesos() ? this.api.listSistemas() : of<readonly SistemaAdmin[]>([]),
      accesos: this.canManageAccesos()
        ? this.api.getUserAccesos(userId).pipe(catchError(() => of<readonly AccesoSistema[]>([])))
        : of<readonly AccesoSistema[]>([]),
    }).subscribe({
      next: ({ usuario, roles, sistemas, accesos }) => {
        this.headline.set(usuario.username);
        const estado = usuario.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
        this.statusForm.patchValue({ status: estado });

        this.rolesCat.set(roles);
        this.sistemasCat.set(sistemas);
        this.accesos.set(accesos.length > 0 ? accesos : (usuario.sistemas ?? []));
        this.loadExternos(sistemas);

        const assigned = usuario.assignedRoleIds ?? [];
        this.rolesForm.patchValue({ roleIds: [...assigned] }, { emitEvent: false });
        this.loadPermisosDeRoles(assigned);

        this.rolesSub = this.rolesForm.controls.roleIds.valueChanges.subscribe((ids) => {
          this.loadPermisosDeRoles(ids);
        });

        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.notify(this.errors.translateAdminApi(raw), SISRH_SNACK_DURATION_MS.long);
        this.loading.set(false);
      },
    });
  }

  private loadPermisosDeRoles(roleIds: readonly number[]): void {
    const seq = ++this.permisosLoadSeq;
    if (roleIds.length === 0) {
      this.permisosDelRol.set([]);
      this.loadingPermisos.set(false);
      return;
    }
    this.loadingPermisos.set(true);
    forkJoin(
      roleIds.map((id) =>
        this.api.getRolPermisos(id).pipe(catchError(() => of<readonly AdminPermisoRow[]>([])))
      )
    ).subscribe({
      next: (resultados) => {
        if (seq !== this.permisosLoadSeq) return;
        const vistos = new Set<number>();
        const todos: AdminPermisoRow[] = [];
        for (const lista of resultados) {
          for (const p of lista) {
            if (!vistos.has(p.id)) {
              vistos.add(p.id);
              todos.push(p);
            }
          }
        }
        this.permisosDelRol.set(
          todos.sort((a, b) => a.codigo.localeCompare(b.codigo))
        );
        this.loadingPermisos.set(false);
      },
      error: () => {
        if (seq !== this.permisosLoadSeq) return;
        this.loadingPermisos.set(false);
      },
    });
  }

  private grupoDePermiso(codigo: string): string {
    if (codigo.startsWith('CAT_')) return 'Catálogos';
    if (codigo.startsWith('EMP_')) return 'Empleados';
    if (codigo.startsWith('PLA_')) return 'Planilla';
    if (codigo.startsWith('PAP_')) return 'Papeletas';
    if (codigo.startsWith('REP_') || codigo.startsWith('RPT_')) return 'Reportes';
    if (codigo.startsWith('ADM_')) return 'Administración';
    return 'General';
  }

  ngOnDestroy(): void {
    this.rolesSub?.unsubscribe();
  }

  private notify(
    message: string,
    duration: SisrhSnackDurationMs = SISRH_SNACK_DURATION_MS.short,
  ): void {
    this.snack.open(message, 'Cerrar', { duration });
  }

  guardarEstado(): void {
    if (!this.userIdOk()) return;
    this.savingEstado.set(true);
    const status = this.statusForm.controls.status.value;
    this.api.patchUserStatus(this.parsedId, { status }).subscribe({
      next: () => {
        this.savingEstado.set(false);
        this.notify(this.errors.adminUsuarioEstadoActualizadoLista());
        this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_STATUS_SAVE' } });
      },
      error: (err: HttpErrorResponse) => {
        this.savingEstado.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.notify(this.errors.translateAdminApi(raw), SISRH_SNACK_DURATION_MS.long);
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
        this.notify(this.errors.adminUsuarioRolesActualizadosLista());
        this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_ROLES_SAVE' } });
      },
      error: (err: HttpErrorResponse) => {
        this.savingRoles.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.notify(this.errors.translateAdminApi(raw), SISRH_SNACK_DURATION_MS.long);
      },
    });
  }

  guardarAccesos(): void {
    if (!this.userIdOk()) return;
    this.savingAccesos.set(true);
    const accesos = this.sistemasExternos().map((sistema) => {
      const current = this.findAcceso(sistema.codigo);
      return {
        codigo: sistema.codigo,
        activo: current?.activo ?? false,
        roles: current?.activo ? [...(current.roles ?? [])] : [],
        area: current?.activo ? (current.area ?? null) : null,
      };
    });
    this.api.putUserAccesos(this.parsedId, { accesos }).subscribe({
      next: () => {
        this.savingAccesos.set(false);
        this.notify('Accesos por sistema actualizados.');
        this.telemetry.track('ADMIN_MODULE_UI', { extra: { action: 'USER_ACCESOS_SAVE' } });
      },
      error: (err: HttpErrorResponse) => {
        this.savingAccesos.set(false);
        const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
        this.notify(this.errors.translateAdminApi(raw), SISRH_SNACK_DURATION_MS.long);
      },
    });
  }

  isAccesoActivo(codigo: string): boolean {
    return this.findAcceso(codigo)?.activo ?? false;
  }

  rolesSeleccionados(codigo: string): readonly string[] {
    return this.findAcceso(codigo)?.roles ?? [];
  }

  rolesDeSistema(codigo: string): readonly SistemaRol[] {
    return this.rolesSistema()[codigo] ?? [];
  }

  areasDeSistema(codigo: string): readonly SistemaArea[] {
    return this.areasSistema()[codigo] ?? [];
  }

  /** Etiqueta contextual del selector de area: Rendimiento (GDR) usa «Oficina». */
  areaLabel(codigo: string): string {
    return codigo === 'rendimiento' ? 'Oficina' : 'Área';
  }

  areaSeleccionada(codigo: string): string {
    return this.findAcceso(codigo)?.area ?? '';
  }

  onToggleAcceso(codigo: string, activo: boolean): void {
    this.upsertAcceso(codigo, { activo, roles: activo ? this.rolesSeleccionados(codigo) : [], area: activo ? this.areaSeleccionada(codigo) : null });
  }

  onRolesAcceso(codigo: string, roles: readonly string[]): void {
    this.upsertAcceso(codigo, { activo: this.isAccesoActivo(codigo), roles: [...roles], area: this.areaSeleccionada(codigo) });
  }

  onAreaAcceso(codigo: string, area: string): void {
    this.upsertAcceso(codigo, { activo: this.isAccesoActivo(codigo), roles: [...this.rolesSeleccionados(codigo)], area: area || null });
  }

  abrirConfirmReset(): void {
    if (!this.userIdOk()) return;
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Reinicio de clave institucional',
        message:
          'Se marcará al usuario para cambiar contraseña al próximo acceso institucional. No se muestra ni copia ninguna contraseña en pantalla.',
        cancelLabel: 'Cancelar',
        confirmLabel: 'Confirmar marca',
        severity: 'warning',
      } satisfies ConfirmDialogData),
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok || !this.userIdOk()) return;
      this.resetting.set(true);
      this.api.resetUserPassword(this.parsedId).subscribe({
        next: () => {
          this.resetting.set(false);
          this.notify(this.errors.adminResetClaveMarcadoOk());
          this.telemetry.track('ADMIN_MODULE_UI', {
            extra: { action: 'USER_RESET_MARKED' },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.resetting.set(false);
          const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
          this.notify(this.errors.translateAdminApi(raw), SISRH_SNACK_DURATION_MS.long);
        },
      });
    });
  }

  private findAcceso(codigo: string): AccesoSistema | undefined {
    return this.accesos().find((a) => a.codigo === codigo);
  }

  private upsertAcceso(
    codigo: string,
    patch: Pick<AccesoSistema, 'activo' | 'roles' | 'area'>,
  ): void {
    const sistema = this.sistemasCat().find((s) => s.codigo === codigo);
    const current = this.findAcceso(codigo);
    const next: AccesoSistema = {
      codigo,
      nombre: current?.nombre ?? sistema?.nombre ?? codigo,
      activo: patch.activo,
      roles: patch.roles,
      area: patch.area ?? null,
    };
    const others = this.accesos().filter((a) => a.codigo !== codigo);
    this.accesos.set([...others, next]);
  }

  private loadExternos(sistemas: readonly SistemaAdmin[]): void {
    const externos = sistemas.filter((s) => s.codigo !== 'sisrh');
    for (const sistema of externos) {
      this.api.listSistemaRoles(sistema.codigo).subscribe({
        next: (roles) => this.rolesSistema.update((cur) => ({ ...cur, [sistema.codigo]: roles })),
        error: (err: HttpErrorResponse) => {
          this.rolesSistema.update((cur) => ({ ...cur, [sistema.codigo]: [] }));
          const raw = isErrorResponse(err.error) ? err.error.mensaje : null;
          const msg = raw
            ? this.errors.translateAdminApi(raw)
            : this.errors.adminSistemaRolesCatalogoError(sistema.nombre);
          this.notify(msg, SISRH_SNACK_DURATION_MS.long);
          this.telemetry.track('ADMIN_MODULE_UI', {
            extra: {
              action: 'SISTEMA_ROLES_LOAD_ERROR',
              sistema: sistema.codigo,
              status: err.status,
            },
          });
        },
      });
      this.api.listSistemaAreas(sistema.codigo).subscribe({
        next: (areas) => this.areasSistema.update((cur) => ({ ...cur, [sistema.codigo]: areas })),
        error: () => this.areasSistema.update((cur) => ({ ...cur, [sistema.codigo]: [] })),
      });
    }
  }
}
