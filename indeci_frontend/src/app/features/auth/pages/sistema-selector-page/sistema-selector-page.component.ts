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
 * Aparece post-OTP cuando el usuario tiene acceso a ≥2 sistemas. Si solo tiene
 * SISRH, {@link LoginFlowService.completeSession} salta esta pantalla.
 *
 * Diseño institucional sobrio (sisrh-design-system): header con saludo, cards
 * por sistema con chips de roles, footer con info de sesión + logout. Cards
 * bloqueadas (rol vacío) muestran candado y no son clickables.
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
                  ? card.nombre + ' (sin acceso)'
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
                  <p class="sys-card__nochip">Sin acceso asignado</p>
                }
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
        justify-content: center;
        padding: 1.5rem 1rem;
      }
      .selector-card {
        width: 100%;
        max-width: 980px;
        background: #fff;
        border-radius: 12px;
        border-color: var(--sisrh-color-border, #e2e8f0) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        padding: 0;
        overflow: hidden;
      }
      .selector-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.125rem 1.5rem;
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-top: 3px solid var(--mat-sys-primary, #0d47a1);
        background: #fafbfc;
      }
      .selector-head__brand {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }
      .selector-head__icon {
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }
      .selector-head__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .selector-greeting {
        padding: 1.5rem 1.5rem 1rem;
      }
      .selector-greeting__title {
        margin: 0 0 0.25rem;
        font-size: 1.375rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.015em;
      }
      .selector-greeting__sub {
        margin: 0;
        font-size: 0.9375rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .selector-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1rem;
        padding: 0.5rem 1.5rem 1.5rem;
      }
      .sys-card {
        all: unset;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        padding: 1.125rem;
        border: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-radius: 10px;
        background: #fff;
        transition: border-color 120ms ease, box-shadow 120ms ease,
          transform 120ms ease;
        text-align: left;
        min-height: 170px;
      }
      .sys-card:hover:not(.sys-card--locked) {
        border-color: var(--mat-sys-primary, #0d47a1);
        box-shadow: 0 4px 12px rgba(13, 71, 161, 0.08);
        transform: translateY(-1px);
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
        gap: 0.375rem;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 8px;
        background: rgba(13, 71, 161, 0.08);
        position: relative;
      }
      .sys-card__icon {
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
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
      }
      .sys-card__name {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .sys-card__desc {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .sys-card__roles {
        margin-top: 0.25rem;
      }
      .sys-card__chip {
        background: rgba(13, 71, 161, 0.08) !important;
        color: var(--mat-sys-primary, #0d47a1) !important;
        font-size: 0.6875rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em;
        min-height: 1.5rem !important;
        height: 1.5rem !important;
      }
      .sys-card__nochip {
        margin: 0;
        font-size: 0.75rem;
        color: var(--sisrh-color-muted, #64748b);
        font-style: italic;
      }
      .selector-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 0.875rem 1.5rem;
        border-top: 1px solid var(--sisrh-color-border, #e2e8f0);
        background: #fafbfc;
        font-size: 0.8125rem;
        color: var(--sisrh-color-muted, #64748b);
      }
      .selector-foot__session {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .selector-foot__session mat-icon {
        color: #16a34a;
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
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
