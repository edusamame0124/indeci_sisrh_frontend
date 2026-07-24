import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';

export const LEGAJO_ROUTES: Routes = [
  {
    path: 'mi-legajo',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import('./pages/mi-legajo-page/mi-legajo-page').then(
        (m) => m.MiLegajoPage,
      ),
    title: 'Mi legajo — SISRH-INDECI',
  },
  {
    path: '',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-list-page/legajo-list-page/legajo-list-page').then(
        (m) => m.LegajoListPage,
      ),
    title: 'Legajo Personal — SISRH-INDECI',
  },
  {
    path: ':personaId',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-detalle-page/legajo-detalle-page/legajo-detalle-page').then(
        (m) => m.LegajoDetallePage,
      ),
    title: 'Detalle de Legajo — SISRH-INDECI',
  },
];