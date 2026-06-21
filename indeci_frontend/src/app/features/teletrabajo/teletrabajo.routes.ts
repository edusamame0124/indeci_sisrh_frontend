import { Routes } from '@angular/router';

export const TELETRABAJO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/teletrabajo-list-page/teletrabajo-list-page').then(
        (m) => m.TeletrabajoListPage,
      ),
  },
 {
    path: ':id',
    loadComponent: () =>
      import('./pages/teletrabajo-detalle-page/teletrabajo-detalle-page').then(
        (m) => m.TeletrabajoDetallePage,
      ),
  },
];