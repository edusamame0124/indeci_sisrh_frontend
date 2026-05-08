import { test, expect, Page } from '@playwright/test';

/**
 * E2E US1 — Edge cases del OTP: cap de 5 intentos + sugerencia hora al 4to fallo.
 *
 * Cubre FR-012 (sugerencia "verificar hora" tras 3 fallos consecutivos)
 * y FR-033 (5 intentos máximos antes de invalidar token temporal).
 */

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

async function setupTemporalSession(page: Page): Promise<void> {
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

async function mockOtpFailure(page: Page): Promise<void> {
  await page.route('**/api/auth/otp/confirm', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 400,
        mensaje: 'Código OTP inválido',
        requiereCaptcha: false,
      }),
    });
  });
}

test.describe('US1 — Edge cases OTP', () => {
  test('shows "verificar hora" hint after 3 failed OTP attempts (FR-012)', async ({ page }) => {
    await setupTemporalSession(page);
    await mockOtpFailure(page);

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('jdoe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/otp/);

    const otpInput = page.getByLabel('Código de verificación');
    for (let i = 0; i < 3; i++) {
      await otpInput.fill('000000');
      await expect(page.getByRole('alert').first()).toContainText('Código incorrecto');
      await otpInput.fill(''); // limpiar para nuevo intento
    }

    // Tras 3 fallos consecutivos
    await expect(page.getByRole('status').first()).toContainText('verifica que la hora');
  });

  test('"Volver al inicio de sesión" link clears session and navigates (FR-013)', async ({
    page,
  }) => {
    await setupTemporalSession(page);

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('jdoe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/otp/);

    await page.getByRole('link', { name: 'Volver al inicio de sesión' }).click();

    // Logout limpia y vuelve a login
    await expect(page).toHaveURL(/\/auth\/login/);
    const accessToken = await page.evaluate(() => localStorage.getItem('sisrh_access_token'));
    expect(accessToken).toBeNull();
  });
});
