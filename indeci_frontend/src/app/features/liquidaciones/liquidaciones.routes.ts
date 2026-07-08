import { Routes } from '@angular/router';

/**
 * Feature 016 — Liquidaciones (contenedor de liquidaciones truncas por cese).
 * Lazy-loaded. La autorización fina la impone el backend (@PreAuthorize PLA_CTS_*).
 */
export const LIQUIDACIONES_ROUTES: Routes = [
  {
    path: 'cts',
    loadComponent: () =>
      import('./pages/cts-liquidacion-page/cts-liquidacion-page.component').then(
        (m) => m.CtsLiquidacionPageComponent,
      ),
    title: 'CTS Trunca — SISRH-INDECI',
  },
  {
    path: 'cts-regular',
    loadComponent: () =>
      import('./pages/cts-regular-generacion-page/cts-regular-generacion-page.component').then(
        (m) => m.CtsRegularGeneracionPageComponent,
      ),
    title: 'CTS Regular (Mayo/Noviembre) — SISRH-INDECI',
  },
  {
    path: 'lbs',
    loadComponent: () =>
      import('./pages/lbs-generacion-page/lbs-generacion-page.component').then(
        (m) => m.LbsGeneracionPageComponent,
      ),
    title: 'Liquidación de Beneficios Sociales — SISRH-INDECI',
  },
  { path: '', redirectTo: 'lbs', pathMatch: 'full' },
];
