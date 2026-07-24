import { Routes } from '@angular/router';
import { planillaAccessGuard } from '../../core/guards/planilla-access.guard';

/**
 * Rutas del Portal del Empleado (SPEC §12.2 PANTALLA-08).
 * Mismo set de roles que Planilla — reutiliza `planillaAccessGuard`.
 */
export const PORTAL_EMPLEADO_ROUTES: Routes = [
  {
    path: 'mi-perfil',
    canActivate: [planillaAccessGuard],
    loadComponent: () =>
      import(
        './pages/mi-perfil-page/mi-perfil-page.component'
      ).then((m) => m.MiPerfilPageComponent),
    title: 'Mi perfil — SISRH-INDECI',
  },
  {
    path: '',
    canActivate: [planillaAccessGuard],
    loadComponent: () =>
      import(
        './pages/portal-empleado-page/portal-empleado-page.component'
      ).then((m) => m.PortalEmpleadoPageComponent),
    title: 'Portal del empleado — SISRH-INDECI',
  },
];
