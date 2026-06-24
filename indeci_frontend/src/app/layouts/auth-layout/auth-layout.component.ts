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
        <p class="auth-layout__brand" aria-label="SISRH-INDECI">SISRH-INDECI</p>
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
  height: 100vh;

  background-image: url('/img/fondo_indeci1.png');
  background-size: cover;
  background-position: 70% center;
  background-repeat: no-repeat;
}
.auth-layout {
  min-height: 100vh;
  overflow: hidden;
}
      .auth-layout__header {
        text-align: center;
        margin-bottom: 1.75rem;
      }
      .auth-layout__brand {
        margin: 0;
        color: var(--sisrh-color-primary, #0f172a);
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: clamp(1.5rem, 4vw, 1.875rem);
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
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
        color: var(--sisrh-color-muted, #64748b);
        font-size: 0.9375rem;
        font-weight: 400;
      }
.auth-layout__content {
  transform: translate(600px, 220px);
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
