import { Routes } from '@angular/router';
import {
  asistenciaAccessGuard,
  planillaAccessGuard,
} from '../../core/guards/planilla-access.guard';

/**
 * Rutas Módulo M04 — Asistencia (SPEC §12.2 PANTALLA-02).
 *
 * RBAC V012_45: la carga y el detalle de importaciones los operan `ASISTENCIA`
 * y `PLANILLA` (permisos `ASI_*`). `subsidios` NO: es cálculo remunerativo
 * (permisos `SUB_*`), exclusivo de `PLANILLA`, por eso declara su propio guard
 * antes del bloque general.
 */
export const ASISTENCIA_ROUTES: Routes = [
  /* ——— Subsidios por Enfermedad/Incapacidad Temporal y Maternidad — solo PLANILLA ——— */
  {
    path: 'subsidios',
    canActivate: [planillaAccessGuard],
    loadComponent: () =>
      import(
        './pages/subsidios-enfermedad-maternidad/subsidios-enfermedad-maternidad.component'
      ).then((m) => m.SubsidiosEnfermedadMaternidadComponent),
    title: 'Subsidios por Enfermedad y Maternidad — SISRH-INDECI',
  },
  {
    path: '',
    canActivate: [asistenciaAccessGuard],
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

      /* ——— Detalle de una importación (historial → clic en el lote) ——— */
      {
        path: 'importaciones/:id',
        loadComponent: () =>
          import('./pages/detalle-importacion-page/detalle-importacion-page.component').then(
            (m) => m.DetalleImportacionPageComponent,
          ),
        title: 'Detalle de importación — SISRH-INDECI',
      },
    ],
  },
];
