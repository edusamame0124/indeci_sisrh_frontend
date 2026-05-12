import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Vista inicial post-login (US1 Spec 002): bienvenida con metadatos de sesión.
 */
@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="welcome" tabindex="-1">
      <h1 class="welcome__title">Bienvenido al SISRH-INDECI</h1>
      <p class="welcome__lead">
        Has iniciado sesión como:
        <strong>{{ usernameDisplay() }}</strong>
      </p>
      <p class="welcome__roles" aria-label="Roles asignados">{{ rolesLabel() }}</p>
      <p class="welcome__hint">
        Esta es una vista inicial. Aquí aparecerán las funciones del área de recursos humanos en
        versiones próximas.
      </p>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .welcome {
        max-width: 48rem;
        padding: 1.5rem 1rem 2rem;
      }
      .welcome__title {
        margin: 0 0 1rem;
        font-size: clamp(1.375rem, 3vw, 1.75rem);
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.02em;
      }
      .welcome__lead {
        margin: 0 0 0.75rem;
        color: #334155;
        font-size: 1rem;
        line-height: 1.5;
      }
      .welcome__roles {
        margin: 0 0 1.25rem;
        color: #475569;
        font-size: 0.9375rem;
      }
      .welcome__hint {
        margin: 0;
        padding: 1rem 1.25rem;
        border-radius: var(--sisrh-radius-md, 8px);
        background: #f1f5f9;
        color: #475569;
        font-size: 0.9375rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class DashboardHomePageComponent {
  private readonly auth = inject(AuthService);

  readonly usernameDisplay = computed(() => this.auth.username() ?? 'Usuario');

  readonly rolesLabel = computed(() => {
    const r = this.auth.roles();
    return r.length ? `Roles asignados: ${r.join(', ')}.` : 'Sin roles asignados en el sistema.';
  });
}
