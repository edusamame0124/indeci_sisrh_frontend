import { test, expect, Page } from '@playwright/test';

/**
 * E2E US3 — Cambio de clave forzado.
 *
 * Cubre Acceptance Scenarios 3.1–3.4:
 *   - Login con clave temporal → backend devuelve newPass='S' → ruta /auth/cambiar-clave
 *   - Validador de complejidad bloquea submit con clave débil
 *   - Confirmación que no coincide bloquea submit
 *   - Cambio exitoso → continúa al flujo OTP siguiente
 */

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

async function mockLoginRequiresPasswordChange(page: Page): Promise<void> {
  await page.route('**/api/auth/login', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    // Primer login: con clave temporal "Temp123!"
    if (body.password === 'Temp123!') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: makeFakeJwt({
            sub: 'juser',
            otpValidado: true,
            newPassOk: false,
            roles: [],
            permisos: [],
            exp: Math.floor(Date.now() / 1000) + 900,
          }),
          newPass: 'S',
          requiereOtp: false,
          requiereEnroll: false,
          roles: [],
          permisos: [],
        }),
      });
      return;
    }
    // Re-login tras cambio: con la nueva clave → flow OTP normal
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: makeFakeJwt({
          sub: 'juser',
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

async function mockChangePasswordSuccess(page: Page): Promise<void> {
  await page.route('**/api/auth/cambiar-clave', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: makeFakeJwt({
          sub: 'juser',
          otpValidado: false,
          newPassOk: true,
          exp: Math.floor(Date.now() / 1000) + 600,
        }),
        refreshToken: null,
        newPass: 'N',
        requiereOtp: false,
        requiereEnroll: false,
        roles: null,
        permisos: null,
      }),
    });
  });
}

test.describe('US3 — Cambio de clave forzado', () => {
  test('weak password blocks submit (Acceptance 3.3)', async ({ page }) => {
    await mockLoginRequiresPasswordChange(page);

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('juser');
    await page.getByLabel('Contraseña', { exact: true }).fill('Temp123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/cambiar-clave/);
    await expect(page.getByRole('heading', { name: 'Cambiar contraseña' })).toBeVisible();

    // Llenar con clave débil
    await page.getByLabel('Nueva contraseña').fill('abc');
    await page.getByLabel('Confirmar nueva contraseña').fill('abc');

    // Strength bar visible y rojo
    await expect(page.getByText('Débil')).toBeVisible();

    // Submit deshabilitado
    const submitBtn = page.getByRole('button', { name: 'Cambiar contraseña' });
    await expect(submitBtn).toBeDisabled();
  });

  test('mismatching confirmation blocks submit (Acceptance 3.4)', async ({ page }) => {
    await mockLoginRequiresPasswordChange(page);

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('juser');
    await page.getByLabel('Contraseña', { exact: true }).fill('Temp123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/cambiar-clave/);

    await page.getByLabel('Nueva contraseña').fill('NuevaClave2026!');
    await page.getByLabel('Confirmar nueva contraseña').fill('OtraClave2026!');
    await page.getByLabel('Confirmar nueva contraseña').blur();

    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled();
  });

  test('happy path: login → change → re-login → OTP page (Acceptance 3.2)', async ({ page }) => {
    await mockLoginRequiresPasswordChange(page);
    await mockChangePasswordSuccess(page);

    await page.goto('/auth/login');
    await page.getByLabel('Usuario').fill('juser');
    await page.getByLabel('Contraseña', { exact: true }).fill('Temp123!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/cambiar-clave/);

    await page.getByLabel('Nueva contraseña').fill('NuevaClave2026!');
    await page.getByLabel('Confirmar nueva contraseña').fill('NuevaClave2026!');

    await expect(page.getByText('Fuerte')).toBeVisible();

    const submitBtn = page.getByRole('button', { name: 'Cambiar contraseña' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Tras cambio + re-login → OTP page (porque user tiene OTP_HABILITADO='S' implícito)
    await expect(page).toHaveURL(/\/auth\/otp/, { timeout: 5000 });
  });
});
