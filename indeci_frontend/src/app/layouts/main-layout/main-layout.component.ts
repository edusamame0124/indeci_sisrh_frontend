import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { ClientTelemetryService } from '../../core/services/client-telemetry.service';
import { LoginFlowService } from '../../features/auth/services/login-flow.service';
import {
  filterNavChildrenByQuery,
  filterVisibleNavItems,
  MAIN_NAV_ITEMS,
} from '../../core/config/main-navigation.config';
import type { MainNavChildItem, MainNavItem } from '../../core/models/main-nav-item.model';
import { flattenNavLeaves } from '../../core/models/main-nav-item.model';

/**
 * Shell principal post-login: sidebar + toolbar + outlet (Spec 002).
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatExpansionModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="shell" [hasBackdrop]="isCompact()">
      <mat-sidenav
        id="sisrh-main-drawer"
        class="shell__drawer"
        [mode]="sidenavMode()"
        [opened]="drawerOpened()"
        [fixedInViewport]="true"
        aria-label="Navegación principal"
      >
        <div class="shell__drawer-brand" aria-label="SISRH INDECI — Recursos humanos">
          <div class="shell__drawer-brand-text">
            <span class="shell__drawer-title">SISRH</span>
            <span class="shell__drawer-subtitle">INDECI</span>
          </div>
          <span class="shell__drawer-tagline">Recursos humanos</span>
        </div>
        <nav class="shell__drawer-nav" role="navigation" aria-label="Secciones de la aplicación">
          <mat-nav-list role="presentation">
            @for (item of displayedNav(); track trackNavKey(item)) {
              @if (item.children?.length) {
                <mat-expansion-panel class="shell__nav-panel" [expanded]="navGroupExpanded(item)">
                  <mat-expansion-panel-header>
                    <mat-panel-title class="shell__nav-panel-title">
                      <mat-icon
                        class="shell__nav-panel-icon"
                        [fontIcon]="item.icon"
                        aria-hidden="true"
                      />
                      <span>{{ item.label }}</span>
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  @if (isCatalogNav(item)) {
                    <div class="shell__catalog-search">
                      <mat-form-field appearance="outline" class="shell__catalog-search-field">
                        <mat-label>Filtrar catálogos</mat-label>
                        <input
                          matInput
                          type="search"
                          autocomplete="off"
                          [value]="catalogFilterQuery()"
                          (input)="onCatalogFilterInput($event)"
                          aria-label="Filtrar ítems del menú Catálogos"
                        />
                        <mat-icon matSuffix fontIcon="search" aria-hidden="true" />
                      </mat-form-field>
                    </div>
                  }
                  @for (c of item.children; track trackChildKey(c)) {
                    @if (c.children?.length) {
                      <mat-expansion-panel
                        class="shell__nav-subpanel"
                        [expanded]="navSubgroupExpanded(c)"
                      >
                        <mat-expansion-panel-header>
                          <mat-panel-title class="shell__nav-subpanel-title">
                            <mat-icon
                              class="shell__nav-subpanel-icon"
                              [fontIcon]="c.icon"
                              aria-hidden="true"
                            />
                            <span>{{ c.label }}</span>
                          </mat-panel-title>
                        </mat-expansion-panel-header>
                        @for (leaf of c.children; track trackChildKey(leaf)) {
                          @if (leaf.comingSoon) {
                            <span
                              mat-list-item
                              class="shell__nav-coming-soon shell__nav-leaf"
                              role="link"
                              aria-disabled="true"
                              matTooltip="Próximamente"
                            >
                              <mat-icon matListItemIcon [fontIcon]="leaf.icon" aria-hidden="true" />
                              <span matListItemTitle>{{ leaf.label }}</span>
                            </span>
                          } @else if (leaf.route) {
                            <a
                              mat-list-item
                              class="shell__nav-leaf"
                              [routerLink]="leaf.route"
                              routerLinkActive="sisrh-nav-active"
                              [routerLinkActiveOptions]="linkActiveOptions(leaf.route)"
                              (click)="onNavSelect()"
                            >
                              <mat-icon matListItemIcon [fontIcon]="leaf.icon" aria-hidden="true" />
                              <span matListItemTitle>{{ leaf.label }}</span>
                            </a>
                          }
                        }
                      </mat-expansion-panel>
                    } @else if (c.comingSoon) {
                      <span
                        mat-list-item
                        class="shell__nav-coming-soon shell__nav-leaf"
                        role="link"
                        aria-disabled="true"
                        matTooltip="Próximamente"
                      >
                        <mat-icon matListItemIcon [fontIcon]="c.icon" aria-hidden="true" />
                        <span matListItemTitle>{{ c.label }}</span>
                      </span>
                    } @else if (c.route) {
                      <a
                        mat-list-item
                        class="shell__nav-leaf"
                        [routerLink]="c.route"
                        routerLinkActive="sisrh-nav-active"
                        [routerLinkActiveOptions]="linkActiveOptions(c.route)"
                        (click)="onNavSelect()"
                      >
                        <mat-icon matListItemIcon [fontIcon]="c.icon" aria-hidden="true" />
                        <span matListItemTitle>{{ c.label }}</span>
                      </a>
                    }
                  }
                </mat-expansion-panel>
              } @else {
                <a
                  mat-list-item
                  [routerLink]="item.route"
                  routerLinkActive="sisrh-nav-active"
                  [routerLinkActiveOptions]="linkActiveOptions(item.route)"
                  (click)="onNavSelect()"
                >
                  <mat-icon matListItemIcon [fontIcon]="item.icon" aria-hidden="true" />
                  <span matListItemTitle>{{ item.label }}</span>
                </a>
              }
            }
          </mat-nav-list>
        </nav>
      </mat-sidenav>

      <mat-sidenav-content class="shell__main">
        <a class="sisrh-skip-link" href="#main-content">Saltar al contenido principal</a>
        <mat-toolbar class="shell__toolbar" role="banner">
          <button
            type="button"
            mat-icon-button
            class="shell__menu-btn"
            (click)="toggleDrawer()"
            [attr.aria-label]="drawerToggleLabel()"
            [attr.aria-expanded]="drawerOpened()"
            aria-controls="sisrh-main-drawer"
            [matTooltip]="drawerToggleLabel()"
            matTooltipPosition="below"
          >
            <mat-icon fontIcon="menu" />
          </button>
          <span class="shell__toolbar-title">SISRH-INDECI</span>
          <span class="shell__toolbar-spacer"></span>
          <button
            type="button"
            mat-button
            class="shell__user-btn"
            [matMenuTriggerFor]="accountMenu"
            aria-haspopup="menu"
            [attr.aria-label]="'Menú de cuenta de ' + userLabel()"
          >
            <span class="shell__user-inner">
              <mat-icon class="shell__user-icon" fontIcon="account_circle" aria-hidden="true" />
              <span class="shell__user-text">{{ userLabel() }}</span>
              <mat-icon class="shell__user-caret" fontIcon="expand_more" aria-hidden="true" />
            </span>
          </button>
          <mat-menu #accountMenu="matMenu" [hasBackdrop]="true">
            <button type="button" mat-menu-item (click)="headerExitToSelector()">Salir</button>
          </mat-menu>
        </mat-toolbar>

        @if (nearExpiry()) {
          <div class="shell__session-hint" role="status" aria-live="polite">
            Su sesión vencerá en breve. Si continúa usando el sistema, puede renovarse
            automáticamente.
          </div>
        }

        <main id="main-content" class="shell__content" tabindex="-1">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .shell {
        height: 100%;
      }
      .shell__drawer {
        width: 248px;
        border-right: 1px solid var(--sisrh-border, #e2e8f0);
        background: var(--sisrh-surface, #fff);
      }
      .shell__drawer-brand {
        padding: 0.75rem 0.75rem 0.625rem;
        border-bottom: 1px solid var(--sisrh-border, #e2e8f0);
        margin-bottom: 0.125rem;
      }
      .shell__drawer-brand-text {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.375rem 0.5rem;
      }
      .shell__drawer-title {
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-weight: 700;
        font-size: 1.125rem;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      .shell__drawer-subtitle {
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--sisrh-color-cta, #0369a1);
        line-height: 1.2;
      }
      .shell__drawer-tagline {
        display: block;
        margin-top: 0.375rem;
        font-size: 0.75rem;
        color: var(--sisrh-color-secondary, #334155);
        line-height: 1.35;
      }
      .shell__drawer-nav {
        padding-top: 0.25rem;
      }
      .shell__nav-panel {
        box-shadow: none !important;
        background: transparent;
        border-radius: 0;
      }
      .shell__nav-panel-title {
        display: flex;
        align-items: center;
        gap: 0.4375rem;
        font-size: 0.8125rem; /* 13px — compactación 90% */
        font-weight: 600;
      }
      .shell__nav-panel-icon {
        margin-right: 0;
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }
      .shell__main {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 100%;
        background: var(--sisrh-color-background, #f8fafc);
      }
      .shell__toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        color: var(--sisrh-toolbar-fg, var(--sisrh-color-primary, #0f172a));
        background-color: var(--sisrh-toolbar-bg, #e2e8f0);
        border-bottom: 1px solid var(--sisrh-toolbar-border, #cbd5e1);
      }
      .shell__toolbar .mat-mdc-icon-button:not(.mat-mdc-button-disabled) .mat-icon,
      .shell__toolbar .mat-mdc-icon-button:not(.mat-mdc-button-disabled) mat-icon {
        color: var(--sisrh-toolbar-fg, var(--sisrh-color-primary, #0f172a));
      }
      .shell__toolbar-title {
        font-weight: 600;
        font-size: 0.9375rem;
        letter-spacing: 0.02em;
        color: inherit;
      }
      .shell__toolbar-spacer {
        flex: 1 1 auto;
      }
      .shell__menu-btn {
        margin-right: 0.25rem;
      }
      .shell__menu-btn:hover {
        background-color: rgba(15, 23, 42, 0.06);
      }
      .shell__menu-btn:focus-visible {
        outline: 3px solid var(--sisrh-color-cta, #0369a1);
        outline-offset: 2px;
      }
      .shell__user-btn {
        max-width: min(42vw, 280px);
        min-height: 42px;
        padding: 0 0.375rem 0 0.625rem;
        border-radius: 9999px;
        color: var(--sisrh-toolbar-fg, var(--sisrh-color-primary, #0f172a));
        border: 1px solid var(--sisrh-color-border-strong, #cbd5e1);
        background: #fff;
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease,
          box-shadow 0.2s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .shell__user-btn {
          transition: none;
        }
      }
      .shell__user-btn:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
      }
      .shell__user-btn:focus-visible {
        outline: 3px solid var(--sisrh-color-cta, #0369a1);
        outline-offset: 2px;
      }
      .shell__user-btn .mat-icon {
        color: inherit;
      }
      .shell__user-inner {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 100%;
      }
      .shell__user-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        font-size: 0.875rem;
        line-height: 1.25;
      }
      .shell__user-icon {
        flex-shrink: 0;
        font-size: 1.375rem;
        width: 1.375rem;
        height: 1.375rem;
        line-height: 1.375rem;
      }
      .shell__user-caret {
        flex-shrink: 0;
        opacity: 0.92;
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
      .shell__session-hint {
        padding: 0.5rem 1rem;
        background: #fff7ed;
        color: #9a3412;
        font-size: 0.875rem;
        border-bottom: 1px solid #fed7aa;
      }
      .shell__content {
        flex: 1 1 auto;
        min-height: 0;
        padding: var(--sisrh-density-page-y, 0.75rem) var(--sisrh-density-page-x, 0.75rem);
      }
      :host ::ng-deep .shell__drawer-nav a.mat-mdc-list-item {
        margin: 2px 8px;
        border-radius: 8px;
        min-height: 40px;
        transition: background-color 0.2s ease, color 0.2s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        :host ::ng-deep .shell__drawer-nav a.mat-mdc-list-item {
          transition: none;
        }
      }
      :host ::ng-deep .shell__drawer-nav a.mat-mdc-list-item:hover {
        background-color: var(--sisrh-surface-muted, #f1f5f9) !important;
      }
      :host ::ng-deep .shell__drawer-nav a.mat-mdc-list-item:focus-visible {
        outline: 3px solid var(--sisrh-color-cta, #0369a1);
        outline-offset: 2px;
      }
      :host ::ng-deep a.sisrh-nav-active.mat-mdc-list-item {
        background-color: color-mix(
          in srgb,
          var(--sisrh-color-cta, #0369a1) 12%,
          var(--sisrh-surface, #fff)
        ) !important;
        box-shadow: inset 3px 0 0 0 var(--sisrh-color-cta, #0369a1);
      }
      :host ::ng-deep a.sisrh-nav-active .mdc-list-item__primary-text {
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
      }
      .shell__catalog-search {
        padding: 0 8px 6px 12px;
        border-bottom: 1px solid var(--sisrh-border-soft, #e7ecf2);
        margin-bottom: 4px;
      }
      .shell__catalog-search-field {
        width: 100%;
        font-size: 0.8125rem;
      }
      :host ::ng-deep .shell__catalog-search-field .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      :host ::ng-deep .shell__catalog-search-field .mat-mdc-text-field-wrapper {
        padding: 0 8px;
      }
      :host ::ng-deep .shell__nav-subpanel {
        box-shadow: none !important;
        background: transparent;
        margin: 0 4px 2px;
        border-radius: 6px;
      }
      :host ::ng-deep .shell__nav-subpanel .mat-expansion-panel-header {
        min-height: 34px !important;
        padding: 0 8px 0 20px !important;
        font-size: 0.75rem;
      }
      .shell__nav-subpanel-title {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--sisrh-color-muted, #64748b);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .shell__nav-subpanel-icon {
        font-size: 1rem !important;
        width: 1rem !important;
        height: 1rem !important;
        opacity: 0.85;
      }
      :host ::ng-deep .shell__nav-subpanel .mat-expansion-panel-body {
        padding: 0 2px 4px;
      }
      :host ::ng-deep .shell__nav-panel + .shell__nav-panel {
        border-top: 1px solid var(--sisrh-border-soft, #e7ecf2);
        margin-top: 2px;
        padding-top: 2px;
      }
      :host ::ng-deep .shell__drawer-nav .mat-mdc-list-item-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }
      :host ::ng-deep .shell__nav-panel .mat-expansion-panel-header {
        margin: 2px 6px;
        border-radius: 8px !important;
        min-height: 40px;
        padding: 0 8px 0 12px;
        transition: background-color 0.2s ease;
      }
      :host ::ng-deep .shell__nav-panel .mat-expansion-panel-header:hover {
        background: var(--sisrh-surface-muted, #f1f5f9) !important;
      }
      :host ::ng-deep .shell__nav-panel .mat-expansion-panel-header:focus-visible {
        outline: 3px solid var(--sisrh-color-cta, #0369a1);
        outline-offset: 2px;
      }
      :host ::ng-deep .shell__nav-panel.mat-expanded > .mat-expansion-panel-header {
        background: var(--sisrh-surface-muted, #f8fafc) !important;
      }
      .shell__nav-coming-soon {
        opacity: 0.55;
        cursor: not-allowed;
        pointer-events: auto;
      }
      :host ::ng-deep .shell__nav-coming-soon .mdc-list-item__primary-text {
        color: #94a3b8;
      }

      /* Sub-items dentro de expansion panels: compactación 90% */
      :host ::ng-deep .shell__nav-panel .mat-expansion-panel-body {
        padding: 0 4px 4px;
      }
      :host ::ng-deep .shell__nav-panel a.mat-mdc-list-item,
      :host ::ng-deep .shell__nav-panel span.mat-mdc-list-item {
        min-height: 36px !important;
        padding-left: 16px !important; /* indent del sub-item */
      }
      :host ::ng-deep .shell__nav-panel a.mat-mdc-list-item .mdc-list-item__primary-text,
      :host ::ng-deep .shell__nav-panel span.mat-mdc-list-item .mdc-list-item__primary-text {
        font-size: 0.78125rem; /* 12.5px */
        letter-spacing: 0.01em;
      }
      /* Top-level (no anidados): padding-x 12px */
      :host ::ng-deep .shell__drawer-nav > .mat-mdc-nav-list > a.mat-mdc-list-item {
        padding-left: 12px !important;
        padding-right: 12px !important;
      }

      /* Toolbar: usuario más compacto (proporción con sidebar) */
      .shell__user-btn {
        min-height: 36px;
      }
      .shell__user-text {
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly flow = inject(LoginFlowService);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly breakpoint = inject(BreakpointObserver);

  private readonly drawerOpenCompact = signal(false);
  readonly catalogFilterQuery = signal('');
  /** Estado en desktop (≥960px): false=visible (default), true=oculto por toggle del usuario. */
  private readonly drawerCollapsedDesktop = signal(false);
  private readonly urlPath = signal(this.stripQuery(this.router.url));

  readonly isCompact = toSignal(
    this.breakpoint.observe('(max-width: 959.98px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly drawerOpened = computed(() => {
    if (this.isCompact()) return this.drawerOpenCompact();
    return !this.drawerCollapsedDesktop();
  });

  readonly sidenavMode = computed(() => (this.isCompact() ? 'over' : 'side'));

  /** Texto contextual del botón hamburguesa según estado actual del drawer. */
  readonly drawerToggleLabel = computed(() =>
    this.drawerOpened() ? 'Ocultar menú lateral' : 'Mostrar menú lateral',
  );

  readonly visibleNav = computed(() =>
    filterVisibleNavItems(MAIN_NAV_ITEMS, this.auth.permisos(), this.auth.roles()),
  );

  readonly displayedNav = computed(() => {
    const items = this.visibleNav();
    const q = this.catalogFilterQuery();
    if (!q.trim()) return items;
    return items.map((item) => {
      if (item.label !== 'Catálogos' || !item.children) return item;
      return { ...item, children: filterNavChildrenByQuery(item.children, q) };
    });
  });

  readonly userLabel = computed(() => this.auth.username() ?? 'Usuario');

  readonly nearExpiry = computed(() => {
    const c = this.auth.claims();
    if (!this.auth.isAuthenticated() || !c?.exp) return false;
    const remaining = c.exp - Math.floor(Date.now() / 1000);
    return remaining > 0 && remaining <= 300;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.urlPath.set(this.stripQuery(this.router.url));
        this.closeCompactDrawer();
      });
  }

  linkActiveOptions(route: string): { exact: boolean } {
    return { exact: route === '/' };
  }

  trackNavKey(item: MainNavItem): string {
    return item.children?.length ? `grp:${item.label}` : item.route;
  }

  navGroupExpanded(item: MainNavItem): boolean {
    const leaves = flattenNavLeaves(item.children);
    if (!leaves.length) return false;
    const p = this.urlPath();
    return leaves.some(
      (c) => c.route && (p === c.route || p.startsWith(`${c.route}/`)),
    );
  }

  navSubgroupExpanded(group: MainNavChildItem): boolean {
    const leaves = flattenNavLeaves(group.children);
    if (!leaves.length) return false;
    const p = this.urlPath();
    return leaves.some(
      (c) => c.route && (p === c.route || p.startsWith(`${c.route}/`)),
    );
  }

  isCatalogNav(item: MainNavItem): boolean {
    return item.label === 'Catálogos';
  }

  trackChildKey(child: MainNavChildItem): string {
    return child.route ?? `grp:${child.label}`;
  }

  onCatalogFilterInput(event: Event): void {
    this.catalogFilterQuery.set((event.target as HTMLInputElement).value);
  }

  private stripQuery(url: string): string {
    const q = url.indexOf('?');
    return q === -1 ? url : url.slice(0, q);
  }

  /** Alterna el drawer según modo: compact toggle overlay, desktop toggle collapsed. */
  toggleDrawer(): void {
    if (this.isCompact()) {
      this.drawerOpenCompact.update((v) => !v);
    } else {
      this.drawerCollapsedDesktop.update((v) => !v);
    }
  }

  onNavSelect(): void {
    this.closeCompactDrawer();
  }

  private closeCompactDrawer(): void {
    if (this.isCompact()) this.drawerOpenCompact.set(false);
  }

  /**
   * Salir del módulo SISRH hacia el Portal Selector (hub SSO).
   * No revoca la sesión central: el cierre total queda en el selector (/auth/logout).
   */
  headerExitToSelector(): void {
    this.telemetry.track('HEADER_EXIT_TO_SELECTOR', { url: this.router.url });
    this.flow.clearReturnUrl();
    void this.router.navigate(['/auth/seleccionar-sistema']);
  }
}
