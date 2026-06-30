import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../../core/services/auth.service';

import {

  filterVisibleNavItems,

  MAIN_NAV_ITEMS,

} from '../../../../core/config/main-navigation.config';

import { buildDashboardCards } from './dashboard-nav-cards';



/**

 * Inicio post-login: bienvenida institucional y accesos directos alineados al menú lateral.

 */

@Component({

  selector: 'app-dashboard-home-page',

  standalone: true,

  imports: [RouterLink, MatIconModule],

  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `

    <main class="dashboard" tabindex="-1">

      <header class="dashboard__hero" aria-labelledby="dashboard-welcome-heading">

        <p class="dashboard__eyebrow">Instituto Nacional de Defensa Civil · INDECI</p>

        <h1 id="dashboard-welcome-heading" class="dashboard__title">

          Portal de Recursos Humanos

        </h1>

        <p class="dashboard__subtitle">

          Sistema de Información de Servicios de Recursos Humanos

          <span class="dashboard__subtitle-mark">(SISRH-INDECI)</span>

        </p>

        <div class="dashboard__session" role="group" aria-label="Datos de la sesión actual">

          <div class="dashboard__session-row">

            <span class="dashboard__session-label">Usuario en sesión</span>

            <span class="dashboard__session-value">{{ usernameDisplay() }}</span>

          </div>

          <p class="dashboard__roles" aria-label="Roles asignados">{{ rolesLabel() }}</p>

        </div>

      </header>



      <section class="dashboard__modules" aria-labelledby="dashboard-modules-heading">

        <div class="dashboard__section-head">

          <h2 id="dashboard-modules-heading" class="dashboard__section-title">Accesos directos</h2>

          <p class="dashboard__section-desc">

            Módulos según su perfil. Use el menú lateral para el detalle de cada sección.

          </p>

        </div>



        <div class="dashboard__bento" role="list">

          @for (card of moduleCards(); track card.label) {

            @if (card.accessible) {

              <a

                class="dashboard__card"

                [class.dashboard__card--primary]="card.primary"

                [class.dashboard__card--wide]="card.wide"

                [routerLink]="card.route"

                role="listitem"

              >

                <span class="dashboard__card-icon-wrap" aria-hidden="true">

                  <mat-icon class="dashboard__card-icon" [fontIcon]="card.icon" />

                </span>

                <span class="dashboard__card-body">

                  <span class="dashboard__card-kicker">{{ card.kicker }}</span>

                  <span class="dashboard__card-title">{{ card.title }}</span>

                  <span class="dashboard__card-text">{{ card.description }}</span>

                  <span class="dashboard__card-cta">

                    {{ card.cta }}

                    <mat-icon fontIcon="arrow_forward" aria-hidden="true" />

                  </span>

                </span>

              </a>

            } @else {

              <div

                class="dashboard__card dashboard__card--locked"

                [class.dashboard__card--wide]="card.wide"

                role="listitem"

                aria-disabled="true"

                tabindex="-1"

              >

                <span class="dashboard__card-icon-wrap" aria-hidden="true">

                  <mat-icon class="dashboard__card-icon" fontIcon="lock" />

                </span>

                <span class="dashboard__card-body">

                  <span class="dashboard__card-kicker">{{ card.kicker }}</span>

                  <span class="dashboard__card-title">{{ card.title }}</span>

                  <span class="dashboard__card-text dashboard__card-text--muted">

                    No tiene permisos asignados para {{ card.label }}. Si corresponde a su función,

                    solicite el rol adecuado a su área de sistemas.

                  </span>

                </span>

              </div>

            }

          }

        </div>

      </section>

    </main>

  `,

  styles: [

    `

      :host {

        display: block;

        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);

      }

      .dashboard {

        max-width: 72rem;

        margin: 0 auto;

        padding: var(--sisrh-spacing-lg, 1.25rem) var(--sisrh-spacing-md, 0.875rem)

          var(--sisrh-spacing-xl, 1.5rem);

      }

      .dashboard__hero {

        position: relative;

        padding: var(--sisrh-spacing-lg, 1.25rem);

        border-radius: var(--sisrh-radius-lg, 16px);

        border: 1px solid var(--sisrh-color-border, #e2e8f0);

        background: #fff;

        box-shadow: var(--sisrh-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));

        overflow: hidden;

      }

      .dashboard__hero::before {

        content: '';

        position: absolute;

        left: 0;

        top: 0;

        bottom: 0;

        width: 4px;

        background: var(--sisrh-primary, #0063A1);

      }

      .dashboard__eyebrow {

        margin: 0 0 var(--sisrh-spacing-sm, 0.5rem);

        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);

        font-size: 0.6875rem;

        font-weight: 600;

        letter-spacing: 0.12em;

        text-transform: uppercase;

        color: var(--sisrh-color-secondary, #334155);

      }

      .dashboard__title {

        margin: 0 0 var(--sisrh-spacing-sm, 0.5rem);

        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);

        font-size: clamp(1.5rem, 2.8vw, 2rem);

        font-weight: 600;

        line-height: 1.2;

        color: var(--sisrh-color-primary, #0f172a);

        letter-spacing: -0.02em;

      }

      .dashboard__subtitle {

        margin: 0 0 var(--sisrh-spacing-lg, 1.5rem);

        font-size: 1rem;

        line-height: 1.55;

        color: var(--sisrh-color-secondary, #334155);

        max-width: 42rem;

      }

      .dashboard__subtitle-mark {

        font-weight: 600;

        color: var(--sisrh-color-text, #020617);

      }

      .dashboard__session {

        padding-top: var(--sisrh-spacing-md, 1rem);

        border-top: 1px solid var(--sisrh-color-border, #e2e8f0);

      }

      .dashboard__session-row {

        display: flex;

        flex-wrap: wrap;

        align-items: baseline;

        gap: 0.5rem 1rem;

        margin-bottom: 0.5rem;

      }

      .dashboard__session-label {

        font-size: 0.8125rem;

        font-weight: 600;

        color: var(--sisrh-color-secondary, #334155);

      }

      .dashboard__session-value {

        font-size: 1rem;

        font-weight: 600;

        color: var(--sisrh-color-text, #020617);

        word-break: break-word;

      }

      .dashboard__roles {

        margin: 0;

        font-size: 0.9375rem;

        line-height: 1.5;

        color: var(--sisrh-color-muted, #64748b);

      }

      .dashboard__modules {

        margin-top: var(--sisrh-spacing-lg, 1.25rem);

      }

      .dashboard__section-head {

        margin-bottom: var(--sisrh-spacing-md, 0.875rem);

      }

      .dashboard__section-title {

        margin: 0 0 0.375rem;

        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);

        font-size: 1.125rem;

        font-weight: 600;

        color: var(--sisrh-color-primary, #0f172a);

      }

      .dashboard__section-desc {

        margin: 0;

        font-size: 0.9375rem;

        line-height: 1.5;

        color: var(--sisrh-color-muted, #64748b);

        max-width: 40rem;

      }

      .dashboard__bento {

        display: grid;

        grid-template-columns: 1fr;

        gap: var(--sisrh-spacing-md, 1rem);

      }

      @media (min-width: 720px) {

        .dashboard__bento {

          grid-template-columns: repeat(2, minmax(0, 1fr));

        }

        .dashboard__card--wide {

          grid-column: 1 / -1;

        }

      }

      .dashboard__card {

        display: flex;

        gap: var(--sisrh-spacing-md, 0.875rem);

        align-items: flex-start;

        min-height: 44px;

        padding: var(--sisrh-spacing-md, 0.875rem);

        border-radius: var(--sisrh-radius-lg, 12px);

        border: 1px solid var(--sisrh-color-border, #e2e8f0);

        background: #fff;

        box-shadow: var(--sisrh-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));

        text-decoration: none;

        color: inherit;

        cursor: pointer;

        transition:

          border-color 0.2s ease,

          box-shadow 0.2s ease,

          background-color 0.2s ease;

      }

      @media (prefers-reduced-motion: reduce) {

        .dashboard__card {

          transition: none;

        }

      }

      .dashboard__card:hover {

        border-color: var(--sisrh-color-border-strong, #cbd5e1);

        box-shadow: var(--sisrh-shadow-md, 0 4px 6px rgba(0, 0, 0, 0.08));

      }

      .dashboard__card:focus {

        outline: none;

      }

      .dashboard__card:focus-visible {

        outline: 3px solid var(--sisrh-primary, #0063A1);

        outline-offset: 3px;

      }

      .dashboard__card--primary {

        border-color: #bae6fd;

        background: #f0f9ff;

      }

      .dashboard__card--primary:hover {

        border-color: #7dd3fc;

      }

      .dashboard__card--locked {

        cursor: not-allowed;

        background: #f8fafc;

        opacity: 1;

      }

      .dashboard__card--locked:hover {

        box-shadow: var(--sisrh-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));

        border-color: var(--sisrh-color-border, #e2e8f0);

      }

      .dashboard__card-icon-wrap {

        flex-shrink: 0;

        display: flex;

        align-items: center;

        justify-content: center;

        width: 2.5rem;

        height: 2.5rem;

        border-radius: var(--sisrh-radius-md, 8px);

        background: #f1f5f9;

        color: var(--sisrh-primary, #0063A1);

      }

      .dashboard__card--primary .dashboard__card-icon-wrap {

        background: #e0f2fe;

      }

      .dashboard__card--locked .dashboard__card-icon-wrap {

        background: var(--sisrh-color-border, #e2e8f0);

        color: var(--sisrh-color-muted, #64748b);

      }

      .dashboard__card-icon {

        font-size: 1.25rem;

        width: 1.25rem;

        height: 1.25rem;

        line-height: 1.25rem;

      }

      .dashboard__card-body {

        display: flex;

        flex-direction: column;

        gap: 0.375rem;

        min-width: 0;

      }

      .dashboard__card-kicker {

        font-size: 0.6875rem;

        font-weight: 700;

        letter-spacing: 0.08em;

        text-transform: uppercase;

        color: var(--sisrh-text-muted, #64748b);

      }

      .dashboard__card-title {

        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);

        font-size: 1.0625rem;

        font-weight: 600;

        color: var(--sisrh-color-primary, #0f172a);

      }

      .dashboard__card-text {

        font-size: 0.875rem;

        line-height: 1.5;

        color: var(--sisrh-color-muted, #64748b);

        margin: 0;

      }

      .dashboard__card-text--muted {

        color: var(--sisrh-color-muted, #64748b);

      }

      .dashboard__card-cta {

        display: inline-flex;

        align-items: center;

        gap: 0.25rem;

        margin-top: 0.5rem;

        font-size: 0.9375rem;

        font-weight: 600;

        color: var(--sisrh-primary, #0063A1);

      }

      .dashboard__card-cta mat-icon {

        font-size: 1.125rem;

        width: 1.125rem;

        height: 1.125rem;

      }

    `,

  ],

})

export class DashboardHomePageComponent {

  private readonly auth = inject(AuthService);



  private readonly visibleNavLabels = computed(() => {

    const visible = filterVisibleNavItems(

      MAIN_NAV_ITEMS,

      this.auth.permisos(),

      this.auth.roles(),

    );

    return new Set(visible.map((i) => i.label));

  });



  readonly moduleCards = computed(() =>

    buildDashboardCards(MAIN_NAV_ITEMS, this.visibleNavLabels()),

  );



  readonly usernameDisplay = computed(() => this.auth.username() ?? 'Usuario');



  readonly rolesLabel = computed(() => {

    const r = this.auth.roles();

    return r.length ? `Roles asignados: ${r.join(', ')}.` : 'Sin roles asignados en el sistema.';

  });

}


