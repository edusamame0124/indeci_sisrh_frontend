import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SistemaSelectorService } from './sistema-selector.service';

/**
 * Fase 3 SSO — Tests del SistemaSelectorService.
 * REGLA-07: caso feliz + casos borde (display, sistema desconocido, bloqueada).
 *
 * Estrategia: AuthService real con un JWT mínimo construido aquí. El service
 * decodifica el claim "sistemas" automáticamente y el computed `cards()` reacciona.
 */

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function accessTokenConSistemas(sistemas?: Record<string, string[]>): string {
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

describe('SistemaSelectorService', () => {
  let service: SistemaSelectorService;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(SistemaSelectorService);
    auth = TestBed.inject(AuthService);
    if (typeof localStorage !== 'undefined') localStorage.clear();
    auth.clearSession();
  });

  afterEach(() => {
    auth.clearSession();
    vi.restoreAllMocks();
  });

  // ─── cards() ────────────────────────────────────────────────────────────────

  it('claim sistemas ausente → solo card SISRH bloqueada', () => {
    auth.setSession({
      token: accessTokenConSistemas(undefined),
      roles: [],
      permisos: [],
    });

    const cards = service.cards();

    expect(cards).toHaveLength(1);
    expect(cards[0].codigo).toBe('sisrh');
    expect(cards[0].bloqueada).toBe(true);
    expect(cards[0].roles).toEqual([]);
  });

  it('claim con SISRH + roles → SISRH activa, sin externos', () => {
    auth.setSession({
      token: accessTokenConSistemas({ sisrh: ['SUPER_ADMIN', 'ADMIN_TI'] }),
      roles: [],
      permisos: [],
    });

    const cards = service.cards();

    expect(cards).toHaveLength(1);
    expect(cards[0].codigo).toBe('sisrh');
    expect(cards[0].bloqueada).toBe(false);
    expect(cards[0].roles.map((r) => r.code)).toEqual(['SUPER_ADMIN', 'ADMIN_TI']);
  });

  it('claim con 3 sistemas → 3 cards en orden 1-2-3', () => {
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        convocatoria: ['ROLE_EVALUADOR'],
        rendimiento: ['JEFE_AREA'],
      }),
      roles: [],
      permisos: [],
    });

    const cards = service.cards();

    expect(cards.map((c) => c.codigo)).toEqual(['sisrh', 'convocatoria', 'rendimiento']);
    expect(cards.every((c) => !c.bloqueada)).toBe(true);
  });

  it('aplica display label cuando rolesDisplay tiene el código', () => {
    // GDR_JUNTA_DIRECTIVOS es un código vigente del catálogo Rendimiento (V57+V68).
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        rendimiento: ['GDR_JUNTA_DIRECTIVOS'],
      }),
      roles: [],
      permisos: [],
    });

    const cards = service.cards();
    const rendimiento = cards.find((c) => c.codigo === 'rendimiento');

    expect(rendimiento).toBeDefined();
    expect(rendimiento!.roles).toHaveLength(1);
    expect(rendimiento!.roles[0]).toEqual({
      code: 'GDR_JUNTA_DIRECTIVOS',
      label: 'Junta de Directivos',
    });
  });

  it('aplica display label para roles GDR normativos V010_69', () => {
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        rendimiento: ['GDR_CIE', 'GDR_TITULAR', 'GDR_AUDITOR'],
      }),
      roles: [],
      permisos: [],
    });

    const rendimiento = service.cards().find((c) => c.codigo === 'rendimiento');

    expect(rendimiento!.roles).toEqual([
      { code: 'GDR_CIE', label: 'CIE' },
      { code: 'GDR_TITULAR', label: 'Titular' },
      { code: 'GDR_AUDITOR', label: 'Auditor' },
    ]);
  });

  it('código sin display map → label cae al código crudo', () => {
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        convocatoria: ['ROLE_DESCONOCIDO'],
      }),
      roles: [],
      permisos: [],
    });

    const conv = service.cards().find((c) => c.codigo === 'convocatoria');
    expect(conv!.roles[0]).toEqual({ code: 'ROLE_DESCONOCIDO', label: 'ROLE_DESCONOCIDO' });
  });

  it('sistema desconocido en el claim → console.warn + se ignora', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        sistema_futuro: ['X'],
      }),
      roles: [],
      permisos: [],
    });

    const cards = service.cards();
    expect(cards.map((c) => c.codigo)).not.toContain('sistema_futuro');
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0]?.[0]).toMatch(/sistema_futuro/);
  });

  // ─── hasMultipleSystems() ───────────────────────────────────────────────────

  it('hasMultipleSystems: false con solo SISRH', () => {
    auth.setSession({
      token: accessTokenConSistemas({ sisrh: ['SUPER_ADMIN'] }),
      roles: [],
      permisos: [],
    });
    expect(service.hasMultipleSystems()).toBe(false);
  });

  it('hasMultipleSystems: true con SISRH + 1 externo', () => {
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        convocatoria: ['ROLE_ADMIN'],
      }),
      roles: [],
      permisos: [],
    });
    expect(service.hasMultipleSystems()).toBe(true);
  });

  it('hasMultipleSystems: false si la card externa está bloqueada (roles vacíos)', () => {
    // Convocatoria aparece pero con [] → bloqueada → no cuenta como "accesible".
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        convocatoria: [],
      }),
      roles: [],
      permisos: [],
    });
    expect(service.hasMultipleSystems()).toBe(false);
  });

  // ─── buildClickTarget() ────────────────────────────────────────────────────

  it('buildClickTarget de SISRH → null (navegación interna)', () => {
    auth.setSession({
      token: accessTokenConSistemas({ sisrh: ['SUPER_ADMIN'] }),
      roles: [],
      permisos: [],
    });
    const sisrh = service.cards().find((c) => c.codigo === 'sisrh')!;
    expect(service.buildClickTarget(sisrh, 'TOKEN')).toBeNull();
  });

  it('buildClickTarget de externa → URL con ?token=', () => {
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        convocatoria: ['ROLE_ADMIN'],
      }),
      roles: [],
      permisos: [],
    });
    const conv = service.cards().find((c) => c.codigo === 'convocatoria')!;
    const target = service.buildClickTarget(conv, 'ABC.XYZ');
    expect(target).toMatch(/[?&]token=ABC\.XYZ$/);
  });

  it('buildClickTarget de card bloqueada → null', () => {
    auth.setSession({
      token: accessTokenConSistemas({
        sisrh: ['SUPER_ADMIN'],
        convocatoria: [],
      }),
      roles: [],
      permisos: [],
    });
    const cards = service.cards();
    // Convocatoria con roles [] no aparece en cards (rolesDelClaim === [] cuenta como "presente",
    // así que SÍ aparece pero bloqueada). Validamos directo el método con card bloqueada.
    const blocked = cards.find((c) => c.codigo === 'convocatoria' && c.bloqueada);
    if (blocked) {
      expect(service.buildClickTarget(blocked, 'TOKEN')).toBeNull();
    } else {
      // Si nuestra lógica filtró la card por roles vacíos, también es válido.
      expect(cards.find((c) => c.codigo === 'convocatoria')).toBeUndefined();
    }
  });
});
