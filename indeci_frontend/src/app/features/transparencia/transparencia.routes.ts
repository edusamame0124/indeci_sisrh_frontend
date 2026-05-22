import { Routes } from '@angular/router';

/**
 * Rutas del Portal de Transparencia (Spec 011 / B4 — M10, Ley 27806).
 * PÚBLICAS: sin `authGuard` — accesibles sin iniciar sesión.
 */
export const TRANSPARENCIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/transparencia-page/transparencia-page.component').then(
        (m) => m.TransparenciaPageComponent,
      ),
    title: 'Portal de Transparencia — SISRH-INDECI',
  },
];
