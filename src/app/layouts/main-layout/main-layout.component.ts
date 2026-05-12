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
import { AuthService } from '../../core/services/auth.service';
import { ClientTelemetryService } from '../../core/services/client-telemetry.service';
import {
  filterVisibleNavItems,
  MAIN_NAV_ITEMS,
} from '../../core/config/main-navigation.config';
import type { MainNavItem } from '../../core/models/main-nav-item.model';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="shell" [hasBackdrop]="isCompact()">
      <mat-sidenav
        class="shell__drawer"
        [mode]="sidenavMode()"
        [opened]="drawerOpened()"
        [fixedInViewport]="true"
        aria-label="Navegación principal"
      >
        <div class="shell__drawer-brand" aria-hidden="true">
          <span class="shell__drawer-title">SISRH</span>
        </div>
        <nav class="shell__drawer-nav" role="navigation" aria-label="Secciones de la aplicación">
          <mat-nav-list role="presentation">
            @for (item of visibleNav(); track trackNavKey(item)) {
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
                  @for (c of item.children; track c.route) {
                    <a
                      mat-list-item
                      [routerLink]="c.route"
                      routerLinkActive="sisrh-nav-active"
                      [routerLinkActiveOptions]="{ exact: c.route === '/' }"
                      (click)="onNavSelect()"
                    >
                      <mat-icon matListItemIcon [fontIcon]="c.icon" aria-hidden="true" />
                      <span matListItemTitle>{{ c.label }}</span>
                    </a>
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
        <mat-toolbar color="primary" class="shell__toolbar" role="banner">
          @if (isCompact()) {
            <button
              type="button"
              mat-icon-button
              class="shell__menu-btn"
              (click)="toggleCompactDrawer()"
              aria-label="Abrir o cerrar menú de navegación"
            >
              <mat-icon fontIcon="menu" />
            </button>
          }
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
            <mat-icon class="shell__user-icon" fontIcon="account_circle" />
            <span class="shell__user-text">{{ userLabel() }}</span>
            <mat-icon fontIcon="arrow_drop_down" aria-hidden="true" />
          </button>
          <mat-menu #accountMenu="matMenu" [hasBackdrop]="true">
            <button type="button" mat-menu-item (click)="headerLogout()">Cerrar sesión</button>
          </mat-menu>
        </mat-toolbar>

        @if (nearExpiry()) {
          <div class="shell__session-hint" role="status" aria-live="polite">
            Tu sesión vencerá en breve. Si continúas usando el sistema, puede renovarse
            automáticamente.
          </div>
        }

        <div class="shell__content">
          <router-outlet />
        </div>
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
        width: 260px;
        border-right: 1px solid #e2e8f0;
        background: #fff;
      }
      .shell__drawer-brand {
        padding: 1rem 1rem 0.75rem;
      }
      .shell__drawer-title {
        font-weight: 700;
        font-size: 1.125rem;
        color: #0f172a;
        letter-spacing: -0.02em;
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
        gap: 0.5rem;
        font-size: 0.9375rem;
      }
      .shell__nav-panel-icon {
        margin-right: 0;
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
      .shell__main {
        display: flex;
        flex-direction: column;
        min-height: 100%;
        background: #f8fafc;
      }
      .shell__toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .shell__toolbar-title {
        font-weight: 600;
        font-size: 1rem;
        letter-spacing: 0.02em;
      }
      .shell__toolbar-spacer {
        flex: 1 1 auto;
      }
      .shell__menu-btn {
        margin-right: 0.25rem;
      }
      .shell__user-btn {
        max-width: min(40vw, 280px);
      }
      .shell__user-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .shell__user-icon {
        margin-right: 0.35rem;
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
      }
      :host ::ng-deep a.sisrh-nav-active .mdc-list-item__primary-text {
        font-weight: 600;
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly breakpoint = inject(BreakpointObserver);

  private readonly drawerOpenCompact = signal(false);
  private readonly urlPath = signal(this.stripQuery(this.router.url));

  readonly isCompact = toSignal(
    this.breakpoint.observe('(max-width: 959.98px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly drawerOpened = computed(() => {
    if (!this.isCompact()) return true;
    return this.drawerOpenCompact();
  });

  readonly sidenavMode = computed(() => (this.isCompact() ? 'over' : 'side'));

  readonly visibleNav = computed(() =>
    filterVisibleNavItems(MAIN_NAV_ITEMS, this.auth.permisos(), this.auth.roles()),
  );

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
    const kids = item.children;
    if (!kids?.length) return false;
    const p = this.urlPath();
    return kids.some((c) => p === c.route || p.startsWith(`${c.route}/`));
  }

  private stripQuery(url: string): string {
    const q = url.indexOf('?');
    return q === -1 ? url : url.slice(0, q);
  }

  toggleCompactDrawer(): void {
    if (!this.isCompact()) return;
    this.drawerOpenCompact.update((v) => !v);
  }

  onNavSelect(): void {
    this.closeCompactDrawer();
  }

  private closeCompactDrawer(): void {
    if (this.isCompact()) this.drawerOpenCompact.set(false);
  }

  headerLogout(): void {
    this.telemetry.track('HEADER_LOGOUT', { url: this.router.url });
    void this.router.navigate(['/auth/logout']);
  }
}
