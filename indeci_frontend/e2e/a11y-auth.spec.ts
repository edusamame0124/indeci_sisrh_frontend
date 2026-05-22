import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * SC-009 — auditoría WCAG 2.1 AA automatizada con axe en rutas auth.
 * Pantallas: login, OTP, cambio de contraseña, cuenta inactiva y error de almacenamiento.
 */
const TOKEN_KEY = 'sisrh_access_token';
const REFRESH_KEY = 'sisrh_refresh_token';

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake`;
}

test.describe('Auth — accesibilidad (axe-core)', () => {
  test('/auth/login cumple reglas axe (sin violaciones críticas)', async ({ page }) => {
    await page.goto('/auth/login');
    const result = await new AxeBuilder({ page }).analyze();
    const critical = result.violations.filter((v) => v.impact === 'critical');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test('/auth/cuenta-inactiva cumple reglas axe (sin violaciones críticas)', async ({ page }) => {
    await page.goto('/auth/cuenta-inactiva');
    const result = await new AxeBuilder({ page }).analyze();
    const critical = result.violations.filter((v) => v.impact === 'critical');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test('/auth/storage-error cumple reglas axe (sin violaciones críticas)', async ({ page }) => {
    await page.goto('/auth/storage-error');
    const result = await new AxeBuilder({ page }).analyze();
    const critical = result.violations.filter((v) => v.impact === 'critical');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test('/auth/otp cumple reglas axe con token temporal OTP', async ({ page }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeFakeJwt({
      sub: 'a11y-otp',
      otpValidado: false,
      newPassOk: true,
      exp,
      iat: Math.floor(Date.now() / 1000),
    });
    await page.addInitScript(
      ([accessKey, refreshKey, tok]: [string, string, string]) => {
        localStorage.setItem(accessKey, tok);
        localStorage.removeItem(refreshKey);
      },
      [TOKEN_KEY, REFRESH_KEY, token],
    );
    await page.goto('/auth/otp');
    const result = await new AxeBuilder({ page }).analyze();
    const critical = result.violations.filter((v) => v.impact === 'critical');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test('/auth/cambiar-clave cumple reglas axe con token de cambio de clave', async ({ page }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeFakeJwt({
      sub: 'a11y-pwd',
      otpValidado: true,
      newPassOk: false,
      roles: [],
      permisos: [],
      exp,
      iat: Math.floor(Date.now() / 1000),
    });
    await page.addInitScript(
      ([accessKey, refreshKey, tok]: [string, string, string]) => {
        localStorage.setItem(accessKey, tok);
        localStorage.removeItem(refreshKey);
      },
      [TOKEN_KEY, REFRESH_KEY, token],
    );
    await page.goto('/auth/cambiar-clave');
    const result = await new AxeBuilder({ page }).analyze();
    const critical = result.violations.filter((v) => v.impact === 'critical');
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
