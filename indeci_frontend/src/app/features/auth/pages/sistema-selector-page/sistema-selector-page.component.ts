import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginFlowService } from '../../services/login-flow.service';
import { SistemaSelectorService } from '../../services/sistema-selector.service';
import { SistemaCard } from '../../models/sistema.model';

/**
 * Fase 3 SSO — Portal Selector.
 *
 * Aparece SIEMPRE post-OTP (el backend manda todos los sistemas activos en el
 * claim "sistemas"). El usuario elige el sistema; las cards sin roles salen
 * bloqueadas con el aviso "contacte al administrador".
 *
 * Diseño institucional sobrio (sisrh-design-system): header con saludo, cards
 * por sistema con chips de roles, footer con info de sesión + logout. Cards
 * bloqueadas (rol vacío) muestran candado y no son clickables; si TODAS están
 * bloqueadas se muestra un aviso superior.
 *
 * Base: V010_34/V010_35 (INDECI_SISTEMA + INDECI_USUARIO_SISTEMA).
 */
@Component({
  selector: 'app-sistema-selector-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="selector-wrap">
      <mat-card class="selector-card" appearance="outlined">
        <header class="selector-head">
          <div class="selector-head__brand">
            <mat-icon class="selector-head__icon" aria-hidden="true">apps</mat-icon>
            <h1 class="selector-head__title">Portal INDECI</h1>
          </div>
          <button
            mat-stroked-button
            color="warn"
            (click)="onLogout()"
            [disabled]="loggingOut()"
            class="selector-head__logout"
          >
            <mat-icon>logout</mat-icon>
            Cerrar sesión
          </button>
        </header>

        <section class="selector-greeting">
          <h2 class="selector-greeting__title">
            {{ saludo() }}@if (username()) {, {{ username() }}}
          </h2>
          <p class="selector-greeting__sub">Selecciona el sistema al que deseas acceder</p>
        </section>

        @if (allBlocked()) {
          <div class="selector-alert" role="alert">
            <mat-icon class="selector-alert__icon" aria-hidden="true">info</mat-icon>
            <span class="selector-alert__txt">
              No tiene roles asignados en ningún sistema. Contacte con el Administrador.
            </span>
          </div>
        }

        <section class="selector-grid" role="list">
          @for (card of cards(); track card.codigo) {
            <button
              type="button"
              role="listitem"
              class="sys-card"
              [class.sys-card--locked]="card.bloqueada"
              [disabled]="card.bloqueada"
              [attr.aria-label]="
                card.bloqueada
                  ? card.nombre + ' — sin roles asignados, contacte al administrador'
                  : 'Ingresar a ' + card.nombre
              "
              (click)="onCardClick(card)"
            >
              <div class="sys-card__icon-wrap">
                <mat-icon class="sys-card__icon" aria-hidden="true">{{ card.icono }}</mat-icon>
                @if (card.bloqueada) {
                  <mat-icon class="sys-card__lock" aria-hidden="true">lock</mat-icon>
                }
              </div>
              <div class="sys-card__body">
                <h3 class="sys-card__name">{{ card.nombre }}</h3>
                <p class="sys-card__desc">{{ card.descripcion }}</p>
                @if (!card.bloqueada && card.roles.length > 0) {
                  <mat-chip-set class="sys-card__roles" aria-label="Roles asignados">
                    @for (rol of card.roles; track rol.code) {
                      <mat-chip disableRipple class="sys-card__chip">{{ rol.label }}</mat-chip>
                    }
                  </mat-chip-set>
                } @else if (card.bloqueada) {
                  <p class="sys-card__nochip">
                    No tiene roles asignados. Contacte con el Administrador.
                  </p>
                }
              </div>
            </button>
          }
          @if (canShowUserManagement()) {
            <button
              type="button"
              role="listitem"
              class="sys-card sys-card--admin"
              aria-label="Abrir GestiÃ³n de Usuarios"
              (click)="onUserManagementClick()"
            >
              <div class="sys-card__icon-wrap">
                <mat-icon class="sys-card__icon" aria-hidden="true">manage_accounts</mat-icon>
              </div>
              <div class="sys-card__body">
                <h3 class="sys-card__name">Gestión de Usuarios</h3>
                <p class="sys-card__desc">Administrar usuarios y accesos a los sistemas INDECI</p>
                <mat-chip-set class="sys-card__roles" aria-label="Rol requerido">
                  <mat-chip disableRipple class="sys-card__chip">Super Administrador</mat-chip>
                </mat-chip-set>
              </div>
            </button>
          }
        </section>

        <footer class="selector-foot">
          <span class="selector-foot__session">
            <mat-icon aria-hidden="true">check_circle</mat-icon>
            Sesión activa · Token válido {{ minutosRestantes() }} min
          </span>
          <span class="selector-foot__ref">
            Fase 3 SSO · Auth Service central · V010_34/V010_35
          </span>
        </footer>
      </mat-card>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .selector-wrap {
        display: flex;
        justify-content: flex-end;
        padding: 0 1.5rem 1rem 1rem;
      }
      .selector-card {
        width: 100%;
        max-width: 480px;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 12px;
        border-color: rgba(226, 232, 240, 0.5) !important;
        box-shadow: 0 8px 32px rgba(15, 23, 42, 0.1);
        padding: 0;
        overflow: hidden;
      }
      .selector-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(226, 232, 240, 0.5);
        border-top: 3px solid var(--mat-sys-primary, #0d47a1);
        background: rgba(250, 251, 252, 0.4);
      }
      .selector-head__brand {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }
      .selector-head__icon {
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
      .selector-head__title {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .selector-greeting {
        padding: 1rem 1rem 0.5rem;
      }
      .selector-greeting__title {
        margin: 0 0 0.125rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.015em;
      }
      .selector-greeting__sub {
        margin: 0;
        font-size: 0.75rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .selector-alert {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 0 1.5rem 0.5rem;
        padding: 0.75rem 0.875rem;
        border: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-left: 3px solid #d97706;
        border-radius: 8px;
        background: #fffbeb;
        color: #92400e;
        font-size: 0.875rem;
        line-height: 1.45;
      }
      .selector-alert__icon {
        color: #d97706;
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        flex-shrink: 0;
        margin-top: 0.05rem;
      }
      .selector-alert__txt {
        margin: 0;
      }
      .selector-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.625rem;
        padding: 0.5rem 1rem 1rem;
      }
      @media (max-width: 680px) {
        .selector-grid {
          grid-template-columns: 1fr;
        }
      }
      .sys-card {
        all: unset;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.95);
        transition: border-color 120ms ease, box-shadow 120ms ease,
          transform 120ms ease;
        text-align: left;
        min-height: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      .sys-card:hover:not(.sys-card--locked) {
        border-color: var(--mat-sys-primary, #0d47a1);
        box-shadow: 0 4px 12px rgba(13, 71, 161, 0.08);
        transform: translateY(-1px);
      }
      .sys-card--admin {
        border-color: rgba(13, 71, 161, 0.35);
        background: #f8fbff;
      }
      .sys-card:focus-visible {
        outline: 2px solid var(--mat-sys-primary, #0d47a1);
        outline-offset: 2px;
      }
      .sys-card--locked {
        cursor: not-allowed;
        opacity: 0.6;
        background: #f8fafc;
      }
      .sys-card__icon-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 8px;
        background: rgba(13, 71, 161, 0.08);
        position: relative;
        flex-shrink: 0;
      }
      .sys-card__icon {
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }
      .sys-card__lock {
        position: absolute;
        right: -6px;
        bottom: -6px;
        background: #fff;
        border-radius: 50%;
        padding: 2px;
        color: var(--sisrh-color-muted, #64748b);
        font-size: 0.875rem;
        width: 1rem;
        height: 1rem;
        border: 1px solid var(--sisrh-color-border, #e2e8f0);
      }
      .sys-card__body {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
      }
      .sys-card__name {
        margin: 0 0 0.125rem 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .sys-card__desc {
        margin: 0;
        font-size: 0.6875rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .sys-card__roles {
        margin-top: auto;
        padding-top: 0.25rem;
      }
      .sys-card__chip {
        background: rgba(13, 71, 161, 0.08) !important;
        color: var(--mat-sys-primary, #0d47a1) !important;
        font-size: 0.6rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em;
        min-height: 1.125rem !important;
        height: 1.125rem !important;
      }
      .sys-card__nochip {
        margin: 0;
        margin-top: auto;
        font-size: 0.75rem;
        color: var(--sisrh-color-muted, #64748b);
        font-style: italic;
      }
      .selector-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.625rem 1rem;
        border-top: 1px solid rgba(226, 232, 240, 0.5);
        background: rgba(250, 251, 252, 0.4);
        font-size: 0.6875rem;
        color: var(--sisrh-color-muted, #64748b);
      }
      .selector-foot__session {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .selector-foot__session mat-icon {
        color: #16a34a;
        font-size: 0.875rem;
        width: 0.875rem;
        height: 0.875rem;
      }
      .selector-foot__ref {
        font-size: 0.6875rem;
        color: var(--sisrh-color-muted, #94a3b8);
      }
    `,
  ],
})
export class SistemaSelectorPageComponent {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly flow = inject(LoginFlowService);
  private readonly selector = inject(SistemaSelectorService);
  private readonly router = inject(Router);

  readonly username = this.auth.username;
  readonly cards = this.selector.cards;
  readonly loggingOut = signal(false);
  readonly canShowUserManagement = computed(() => this.auth.roles().includes('SUPER_ADMIN'));

  /** True si el usuario no tiene roles en NINGÚN sistema (todas las cards bloqueadas). */
  readonly allBlocked = computed(() => {
    const list = this.cards();
    return list.length > 0 && list.every((c) => c.bloqueada);
  });

  readonly saludo = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly minutosRestantes = computed(() => {
    const claims = this.auth.claims();
    if (!claims || typeof claims.exp !== 'number') return 0;
    const segundosRestantes = claims.exp - Math.floor(Date.now() / 1000);
    return Math.max(0, Math.floor(segundosRestantes / 60));
  });

  onCardClick(card: SistemaCard): void {
    if (card.bloqueada) return;

    const accessToken = this.auth.accessToken();

    // SISRH (sin urlBase): navegación interna al returnUrl preservado.
    if (!card.urlBase) {
      const returnUrl = this.flow.returnUrl();
      this.flow.clearReturnUrl();
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    // Externo: redirección HTTP con token en query param.
    const target = this.selector.buildClickTarget(card, accessToken);
    if (target) {
      window.location.href = target;
    }
  }

  onUserManagementClick(): void {
    void this.router.navigate(['/admin/usuarios']);
  }

  onLogout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.authApi.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.auth.clearSession();
    this.flow.clearReturnUrl();
    void this.router.navigate(['/auth/login']);
  }
}
