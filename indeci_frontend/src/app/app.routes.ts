import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    // Portal público de Transparencia (Ley 27806) — sin authGuard.
    path: 'transparencia',
    loadChildren: () =>
      import('./features/transparencia/transparencia.routes').then(
        (m) => m.TRANSPARENCIA_ROUTES,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-home-page/dashboard-home-page.component').then(
            (m) => m.DashboardHomePageComponent,
          ),
        title: 'Inicio — SISRH-INDECI',
      },
      {
        path: 'empleados',
        loadChildren: () =>
          import('./features/empleados/empleados.routes').then((m) => m.EMPLEADOS_ROUTES),
      },
      {
        path: 'gestiones-personal',
        loadChildren: () =>
          import('./features/gestiones-personal/gestiones-personal.routes').then(
            (m) => m.GESTIONES_PERSONAL_ROUTES,
          ),
      },
      {
        path: 'catalogos',
        loadChildren: () =>
          import('./features/catalogos/catalogos.routes').then((m) => m.CATALOGOS_ROUTES),
      },
      {
        path: 'asistencia',
        loadChildren: () =>
          import('./features/asistencia/asistencia.routes').then((m) => m.ASISTENCIA_ROUTES),
      },
      {
        path: 'planilla',
        loadChildren: () =>
          import('./features/planilla/planilla.routes').then((m) => m.PLANILLA_ROUTES),
      },
      {
        path: 'portal-empleado',
        loadChildren: () =>
          import('./features/portal-empleado/portal-empleado.routes').then(
            (m) => m.PORTAL_EMPLEADO_ROUTES,
          ),
      },
      {
        path: 'reportes',
        loadChildren: () =>
          import('./features/reportes/reportes.routes').then((m) => m.REPORTES_ROUTES),
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/pages/fallback-route.component').then((m) => m.FallbackRouteComponent),
  },
];
