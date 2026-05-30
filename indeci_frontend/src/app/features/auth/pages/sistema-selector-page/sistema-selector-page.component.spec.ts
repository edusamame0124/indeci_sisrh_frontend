import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';

import { SistemaSelectorPageComponent } from './sistema-selector-page.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthApiService } from '../../services/auth-api.service';
import { LoginFlowService } from '../../services/login-flow.service';

/**
 * Fase 3 SSO — Tests del SistemaSelectorPageComponent.
 * Render de cards, click handlers (SISRH interno / externo / bloqueada) y logout.
 */

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function accessToken(sistemas?: Record<string, string[]>): string {
  const exp = Math.floor(Date.now() / 1000) + 600;
  return makeJwt({
    sub: 'admin',
    otpValidado: true,
    newPassOk: true,
    roles: [],
    permisos: [],
    sistemas,
    exp,
  });
}

describe('SistemaSelectorPageComponent', () => {
  let fixture: ComponentFixture<SistemaSelectorPageComponent>;
  let component: SistemaSelectorPageComponent;
  let auth: AuthService;
  let api: AuthApiService;
  let flow: LoginFlowService;
  let router: Router;
  let originalLocation: Location;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
      ],
    });

    auth = TestBed.inject(AuthService);
    api = TestBed.inject(AuthApiService);
    flow = TestBed.inject(LoginFlowService);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    if (typeof localStorage !== 'undefined') localStorage.clear();
    auth.clearSession();

    // Stub de window.location.href para que el click externo no haga
    // navegación real del jsdom (rompería el resto de los tests).
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    auth.clearSession();
    vi.restoreAllMocks();
  });

  function mountWith(sistemas?: Record<string, string[]>): void {
    auth.setSession({
      token: accessToken(sistemas),
      roles: [],
      permisos: [],
    });
    fixture = TestBed.createComponent(SistemaSelectorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  it('renderiza 1 card cuando solo hay SISRH', () => {
    mountWith({ sisrh: ['SUPER_ADMIN'] });
    const cards = fixture.nativeElement.querySelectorAll('.sys-card');
    expect(cards).toHaveLength(1);
  });

  it('renderiza 3 cards en orden con 3 sistemas asignados', () => {
    mountWith({
      sisrh: ['SUPER_ADMIN'],
      convocatoria: ['ROLE_ADMIN'],
      rendimiento: ['JEFE_AREA'],
    });

    const cards = fixture.nativeElement.querySelectorAll('.sys-card');
    expect(cards).toHaveLength(3);
    const nombres = Array.from(cards).map((el) =>
      (el as HTMLElement).querySelector('.sys-card__name')?.textContent?.trim(),
    );
    expect(nombres).toEqual(['SISRH', 'Convocatoria', 'Rendimiento']);
  });

  it('card bloqueada (roles vacíos) tiene atributo disabled y clase sys-card--locked', () => {
    mountWith({
      sisrh: ['SUPER_ADMIN'],
      convocatoria: [],
    });

    const blockedCard = Array.from(
      fixture.nativeElement.querySelectorAll('.sys-card') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.classList.contains('sys-card--locked'));

    expect(blockedCard).toBeDefined();
    expect(blockedCard!.disabled).toBe(true);
  });

  // ─── Click handlers ────────────────────────────────────────────────────────

  it('click en SISRH → router.navigateByUrl(returnUrl) + clearReturnUrl', () => {
    flow.setReturnUrl('/dashboard');
    mountWith({
      sisrh: ['SUPER_ADMIN'],
      convocatoria: ['ROLE_ADMIN'],
    });

    const sisrhCard = Array.from(
      fixture.nativeElement.querySelectorAll('.sys-card') as NodeListOf<HTMLButtonElement>,
    )[0]; // primer card por orden = sisrh
    sisrhCard.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(flow.returnUrl()).toBe('/');
    expect(window.location.href).toBe(''); // sin redirección externa
  });

  it('click en card externa → window.location.href con ?token=', () => {
    mountWith({
      sisrh: ['SUPER_ADMIN'],
      convocatoria: ['ROLE_ADMIN'],
    });

    const convCard = Array.from(
      fixture.nativeElement.querySelectorAll('.sys-card') as NodeListOf<HTMLButtonElement>,
    ).find((btn) =>
      btn.querySelector('.sys-card__name')?.textContent?.includes('Convocatoria'),
    );

    expect(convCard).toBeDefined();
    convCard!.click();

    expect(window.location.href).toMatch(/[?&]token=/);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('click en card bloqueada → no hace nada', () => {
    flow.setReturnUrl('/dashboard');
    mountWith({
      sisrh: ['SUPER_ADMIN'],
      convocatoria: [],
    });

    const blocked = Array.from(
      fixture.nativeElement.querySelectorAll('.sys-card') as NodeListOf<HTMLButtonElement>,
    ).find((btn) => btn.classList.contains('sys-card--locked'));

    blocked?.click();

    expect(window.location.href).toBe('');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(flow.returnUrl()).toBe('/dashboard'); // preserved
  });

  // ─── Logout ────────────────────────────────────────────────────────────────

  it('onLogout → authApi.logout + clearSession + navega a /auth/login', () => {
    vi.spyOn(api, 'logout').mockReturnValue(of(undefined));
    const clearSpy = vi.spyOn(auth, 'clearSession');
    mountWith({
      sisrh: ['SUPER_ADMIN'],
      convocatoria: ['ROLE_ADMIN'],
    });

    component.onLogout();

    expect(api.logout).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
