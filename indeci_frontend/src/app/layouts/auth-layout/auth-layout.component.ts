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
      <section class="auth-layout__content">
        <router-outlet />
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        background-image: url('/img/fondo_indeci1.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      .auth-layout {
        min-height: 100vh;
        overflow: hidden;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 1.5rem 2rem 1rem;
      }
      .auth-layout__content {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
    `,
  ],
})
export class AuthLayoutComponent {}
