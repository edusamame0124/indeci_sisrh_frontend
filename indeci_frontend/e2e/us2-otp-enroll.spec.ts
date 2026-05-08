import { test, expect, Page } from '@playwright/test';

/**
 * E2E US2 — Primer login con activación del segundo factor.
 *
 * Cubre Acceptance Scenarios 2.1 + 2.2:
 *   - Usuario nuevo sin OTP → backend responde requiereEnroll=true → ruta /auth/otp/enroll
 *   - Frontend llama enroll → recibe QR data URL → muestra QR + instrucciones + input
 *   - Usuario ingresa código → backend confirma → sesión completa + redirección
 */

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

const FAKE_QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function mockLoginRequiresEnroll(page: Page): Promise<void> {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: makeFakeJwt({
          sub: 'jnewuser',
          otpValidado: false,
          newPassOk: true,
          exp: Math.floor(Date.now() / 1000) + 600,
        }),
        requiereOtp: false,
        requiereEnroll: true,
        newPass: 'N',
        roles: [],
        permisos: [],
      }),
    });
  });
}

async function mockEnrollSuccess(page: Page): Promise<void> {
  await page.route('**/api/auth/otp/enroll', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ qrImage: FAKE_QR }),
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
          sub: 'jnewuser',
          otpValidado: true,
          newPassOk: true,
          roles: ['EMPLEADO'],
          permisos: [],
          exp: Math.floor(Date.now() / 1000) + 7200,
        }),
        refreshToken: makeFakeJwt({
          sub: 'jnewuser',
          type: 'refresh',
          exp: Math.floor(Date.now() / 1000) + 86400,
        }),
        roles: ['EMPLEADO'],
        permisos: [],
        newPass: 'N',
        requiereOtp: false,
        requiereEnroll: false,
      }),
    });
  });
}

test.describe('US2 — Primer login con enroll OTP', () => {
  test('happy path: login → ver QR → confirmar código → dashboard', async ({ page }) => {
    await mockLoginRequiresEnroll(page);
    await mockEnrollSuccess(page);
    await mockOtpConfirmSuccess(page);

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('jnewuser');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Tras submit → /auth/otp/enroll
    await expect(page).toHaveURL(/\/auth\/otp\/enroll/);
    await expect(page.getByRole('heading', { name: 'Activar segundo factor' })).toBeVisible();

    // Username visible para confirmación
    await expect(page.getByText('jnewuser')).toBeVisible();

    // QR visible con alt accesible
    const qrImg = page.getByRole('img', { name: /Código QR/ });
    await expect(qrImg).toBeVisible();
    await expect(qrImg).toHaveAttribute('src', FAKE_QR);

    // Instrucciones visibles
    await expect(page.getByRole('heading', { name: 'Cómo activar tu segundo factor' })).toBeVisible();
    await expect(page.getByText('Google Authenticator')).toBeVisible();

    // Ingresar código de confirmación
    await page.getByLabel('Código de verificación').fill('123456');

    // Snackbar de éxito visible (FR-017)
    await expect(page.getByText('Segundo factor activado correctamente')).toBeVisible();

    // Tras delay del snackbar, navegación fuera de /auth/**
    await expect(page).not.toHaveURL(/\/auth\/otp\/enroll/, { timeout: 3000 });

    // Tokens persistidos
    const accessToken = await page.evaluate(() => localStorage.getItem('sisrh_access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('sisrh_refresh_token'));
    expect(accessToken).not.toBeNull();
    expect(refreshToken).not.toBeNull();
  });

  test('redirects to login if backend says "OTP ya está configurado"', async ({ page }) => {
    await mockLoginRequiresEnroll(page);
    await page.route('**/api/auth/otp/enroll', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 400,
          mensaje: 'OTP ya está configurado',
          requiereCaptcha: false,
        }),
      });
    });

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('jnewuser');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Llega a enroll, pero al hacer enroll → redirige a login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });
});
