import { Routes } from '@angular/router';

/**
 * Feature 016 — Liquidaciones (contenedor de liquidaciones truncas por cese).
 * Lazy-loaded. La autorización fina la impone el backend (@PreAuthorize PLA_CTS_*).
 *
 * <p>CTS Trunca ya NO tiene pantalla propia: se calcula automáticamente dentro de LBS
 * ({@code LbsCalculationService} invoca {@code CtsCalculadorService} como bean, sin HTTP).
 * La antigua ruta 'cts' (candidatos/cálculo manual/aprobación) quedaba huérfana — eliminada.</p>
 */
export const LIQUIDACIONES_ROUTES: Routes = [
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
