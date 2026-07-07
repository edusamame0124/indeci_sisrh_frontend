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
    title: 'Liquidación de CTS Trunca — SISRH-INDECI',
  },
  { path: '', redirectTo: 'cts', pathMatch: 'full' },
];
