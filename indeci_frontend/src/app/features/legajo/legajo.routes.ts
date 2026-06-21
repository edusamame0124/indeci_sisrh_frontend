import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';

export const LEGAJO_ROUTES: Routes = [
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