import { Routes } from '@angular/router';
import { planillaAccessGuard } from '../../core/guards/planilla-access.guard';

/**
 * Rutas Módulo M04 — Asistencia (SPEC §12.2 PANTALLA-02).
 * Mismo set de roles que Planilla (ROL_RRHH) — reutiliza `planillaAccessGuard`.
 */
export const ASISTENCIA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [planillaAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'carga' },

      /* ——— Carga de asistencia (PANTALLA-02) ——— */
      {
        path: 'carga',
        loadComponent: () =>
          import('./pages/carga-asistencia-shell/carga-asistencia-shell.component').then(
            (m) => m.CargaAsistenciaShellComponent,
          ),
        title: 'Carga de asistencia — SISRH-INDECI',
      },
    ],
  },
];
