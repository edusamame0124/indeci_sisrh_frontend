import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

/**
 * Cuenta inactiva (FR-028). Mensaje institucional; CTA hacia login.
 */
@Component({
  selector: 'app-inactive-account-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card" appearance="outlined" role="region" aria-labelledby="inactive-title">
      <header class="auth-head">
        <h1 id="inactive-title" class="auth-head__title">Cuenta inactiva</h1>
        <p class="auth-head__sub">No es posible acceder al sistema con este usuario</p>
      </header>

      <mat-card-content class="auth-body">
        <p class="lead" role="alert">
          Su cuenta está inactiva. Comuníquese con Mesa de Ayuda para reactivarla.
        </p>
        <p class="muted">
          Si necesita soporte técnico, indique su usuario institucional y el mensaje que ve en pantalla.
        </p>
        <a
          mat-flat-button
          color="primary"
          class="action"
          routerLink="/auth/login"
        >
          Volver al inicio de sesión
        </a>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .auth-card {
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        padding: 0;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        border-color: var(--sisrh-color-border, #e2e8f0) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }
      .auth-head {
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-top: 3px solid var(--mat-sys-primary, #0d47a1);
        background: #fafbfc;
      }
      .auth-head__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .auth-head__sub {
        margin: 0.35rem 0 0;
        font-size: 0.875rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .auth-body.mat-mdc-card-content {
        padding: 1.375rem 1.5rem 1.5rem !important;
      }
      .lead {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        line-height: 1.5;
        color: var(--sisrh-color-text, #020617);
      }
      .muted {
        margin: 0 0 1.25rem;
        color: var(--sisrh-color-muted, #64748b);
        font-size: 0.9375rem;
        line-height: 1.5;
      }
      .action {
        width: 100%;
        min-height: 44px;
        font-weight: 600;
      }
    `,
  ],
})
export class InactiveAccountPageComponent {}
