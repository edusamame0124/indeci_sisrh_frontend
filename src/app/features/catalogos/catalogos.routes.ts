import { Routes } from '@angular/router';
import { catalogosAccessGuard } from '../../core/guards/catalogos-access.guard';

export const CATALOGOS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [catalogosAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bancos' },
      {
        path: 'bancos',
        loadComponent: () =>
          import('./pages/banco-catalog-page/banco-catalog-page.component').then(
            (m) => m.BancoCatalogPageComponent,
          ),
        title: 'Bancos — Catálogos — SISRH-INDECI',
      },
      {
        path: 'tipos-cuenta',
        loadComponent: () =>
          import('./pages/tipo-cuenta-catalog-page/tipo-cuenta-catalog-page.component').then(
            (m) => m.TipoCuentaCatalogPageComponent,
          ),
        title: 'Tipos de cuenta — Catálogos — SISRH-INDECI',
      },
      {
        path: 'ubigeo',
        loadComponent: () =>
          import('./pages/ubigeo-browse-page/ubigeo-browse-page.component').then(
            (m) => m.UbigeoBrowsePageComponent,
          ),
        title: 'Ubigeo — Catálogos — SISRH-INDECI',
      },
    ],
  },
];
