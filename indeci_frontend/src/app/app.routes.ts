import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
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
        path: 'rrhh',
        loadChildren: () =>
          import('./features/rrhh/rrhh.routes').then((m) => m.RRHH_ROUTES),
      },
      {
        path: 'catalogos',
        loadChildren: () =>
          import('./features/catalogos/catalogos.routes').then((m) => m.CATALOGOS_ROUTES),
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
