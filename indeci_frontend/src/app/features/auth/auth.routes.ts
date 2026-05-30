import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';
import { changePasswordGuard } from '../../core/guards/change-password.guard';
import { temporalTokenGuard } from '../../core/guards/temporal-token.guard';

/**
 * Rutas del feature auth. Todas envueltas por AuthLayoutComponent.
 * Lazy loading de componentes con `loadComponent` para mantener bundle inicial pequeño (SC-011).
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
        title: 'Iniciar sesión — SISRH-INDECI',
      },
      {
        path: 'otp',
        canActivate: [temporalTokenGuard],
        loadComponent: () =>
          import('./pages/otp-page/otp-page.component').then((m) => m.OtpPageComponent),
        title: 'Verificación en dos pasos — SISRH-INDECI',
      },
      {
        path: 'otp/enroll',
        canActivate: [temporalTokenGuard],
        loadComponent: () =>
          import('./pages/otp-enroll-page/otp-enroll-page.component').then(
            (m) => m.OtpEnrollPageComponent,
          ),
        title: 'Activar segundo factor — SISRH-INDECI',
      },
      {
        path: 'cambiar-clave',
        canActivate: [changePasswordGuard],
        loadComponent: () =>
          import('./pages/change-password-page/change-password-page.component').then(
            (m) => m.ChangePasswordPageComponent,
          ),
        title: 'Cambiar contraseña — SISRH-INDECI',
      },
      {
        path: 'cuenta-inactiva',
        loadComponent: () =>
          import('./pages/inactive-account-page/inactive-account-page.component').then(
            (m) => m.InactiveAccountPageComponent,
          ),
        title: 'Cuenta inactiva — SISRH-INDECI',
      },
      {
        // Fase 3 SSO — Portal Selector entre SISRH/SISCONV/GDR. Aparece tras
        // OTP exitoso si el usuario tiene acceso a ≥2 sistemas (decidido por
        // LoginFlowService.completeSession). No tiene guard: el componente
        // ya consume el access token via AuthService y se autoprotege.
        path: 'seleccionar-sistema',
        loadComponent: () =>
          import('./pages/sistema-selector-page/sistema-selector-page.component').then(
            (m) => m.SistemaSelectorPageComponent,
          ),
        title: 'Portal INDECI — Seleccionar sistema',
      },
      {
        path: 'storage-error',
        loadComponent: () =>
          import('./pages/storage-error-page/storage-error-page.component').then(
            (m) => m.StorageErrorPageComponent,
          ),
        title: 'Almacenamiento no disponible — SISRH-INDECI',
      },
      {
        path: 'logout',
        loadComponent: () =>
          import('./pages/logout-page/logout-page.component').then((m) => m.LogoutPageComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
];
