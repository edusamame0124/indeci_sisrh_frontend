import { test, expect, Page } from '@playwright/test';

/**
 * E2E US1 — Login normal con OTP ya configurado.
 *
 * Cubre Acceptance Scenarios 1.1 + 1.2:
 *   - Usuario ingresa credenciales válidas → backend responde requiereOtp=true → ruta /auth/otp
 *   - Usuario ingresa código OTP correcto → backend responde con sesión completa → ruta dashboard
 *
 * Estrategia: backend mockeado vía Playwright route interception (no requiere backend levantado).
 */

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

async function mockLoginWithOtp(page: Page): Promise<void> {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: makeFakeJwt({
          sub: 'jdoe',
          otpValidado: false,
          newPassOk: true,
          exp: Math.floor(Date.now() / 1000) + 600,
          iat: Math.floor(Date.now() / 1000),
        }),
        requiereOtp: true,
        requiereEnroll: false,
        newPass: 'N',
        roles: [],
        permisos: [],
      }),
    });
  });
}

async function mockOtpConfirmSuccess(page: Page): Promise<void> {
  await page.route('**/api/auth/otp/confirm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: makeFakeJwt({
          sub: 'jdoe',
          otpValidado: true,
          newPassOk: true,
          roles: ['EMPLEADO'],
          permisos: ['RRHH_READ'],
          exp: Math.floor(Date.now() / 1000) + 7200,
          iat: Math.floor(Date.now() / 1000),
        }),
        refreshToken: makeFakeJwt({
          sub: 'jdoe',
          type: 'refresh',
          exp: Math.floor(Date.now() / 1000) + 86400,
          iat: Math.floor(Date.now() / 1000),
        }),
        roles: ['EMPLEADO'],
        permisos: ['RRHH_READ'],
        newPass: 'N',
        requiereOtp: false,
        requiereEnroll: false,
      }),
    });
  });
}

test.describe('US1 — Login normal con OTP', () => {
  test('happy path: credenciales válidas + OTP correcto → dashboard', async ({ page }) => {
    await mockLoginWithOtp(page);
    await mockOtpConfirmSuccess(page);

    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Inicie sesión' })).toBeVisible();

    await page.getByLabel('Usuario').fill('jdoe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Tras submit → /auth/otp
    await expect(page).toHaveURL(/\/auth\/otp/);
    await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeVisible();
    await expect(page.getByText('jdoe')).toBeVisible();

    // Ingresar código OTP
    await page.getByLabel('Código de verificación').fill('123456');

    // Tras OK → sale de /auth/** (navegación a /)
    await expect(page).not.toHaveURL(/\/auth\/otp/);

    // Tokens persistidos en localStorage
    const accessToken = await page.evaluate(() => localStorage.getItem('sisrh_access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('sisrh_refresh_token'));
    expect(accessToken).not.toBeNull();
    expect(refreshToken).not.toBeNull();
  });

  test('toggle visibility shows password text (FR-003)', async ({ page }) => {
    await page.goto('/auth/login');
    const passwordInput = page.getByLabel('Contraseña', { exact: true });
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
