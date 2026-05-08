import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Layout minimal para todo el flujo /auth/**: sin sidebar, sin header de app.
 * Solo branding institucional INDECI centrado y el outlet de la ruta.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-layout">
      <header class="auth-layout__header">
        <h1 class="auth-layout__brand">SISRH-INDECI</h1>
        <p class="auth-layout__subtitle">Sistema Integrado de Recursos Humanos</p>
      </header>
      <section class="auth-layout__content">
        <router-outlet />
      </section>
      <footer class="auth-layout__footer">
        <small>Instituto Nacional de Defensa Civil</small>
      </footer>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f8fafc;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .auth-layout {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        padding: 2rem 1rem;
      }
      .auth-layout__header {
        text-align: center;
        margin-bottom: 1.75rem;
      }
      .auth-layout__brand {
        margin: 0;
        color: #0f172a;
        font-size: clamp(1.5rem, 4vw, 1.875rem);
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .auth-layout__brand::after {
        content: '';
        display: block;
        width: 3rem;
        height: 3px;
        margin: 0.75rem auto 0;
        background: var(--mat-sys-primary, #0d47a1);
        border-radius: 2px;
      }
      .auth-layout__subtitle {
        margin: 0.75rem 0 0;
        color: #64748b;
        font-size: 0.9375rem;
        font-weight: 400;
      }
      .auth-layout__content {
        flex: 1;
        width: 100%;
        max-width: 920px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .auth-layout__footer {
        margin-top: 2rem;
        color: #94a3b8;
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class AuthLayoutComponent {}
