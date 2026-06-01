import { Routes } from '@angular/router';
import { reportesAccessGuard } from '../../core/guards/reportes-access.guard';

/**
 * Rutas Módulo 4 — Reportes (Spec 009 / T160-T163).
 * T160 funcional: Boleta de Pago HTML imprimible. T161-T163 stubs.
 */
export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [reportesAccessGuard],
    children: [
      // Default landing: resumen-mensual (stub) — boleta requiere :empleadoId/:periodo
      { path: '', pathMatch: 'full', redirectTo: 'resumen-mensual' },

      /* ——— Boleta de pago (T160) — funcional ——— */
      {
        path: 'boleta/:empleadoId/:periodo',
        loadComponent: () =>
          import('./pages/boleta-page/boleta-page.component').then(
            (m) => m.BoletaPageComponent,
          ),
        title: 'Boleta de pago — SISRH-INDECI',
      },

      /* ——— Resumen general (PANTALLA-04) ——— */
      {
        path: 'resumen-mensual',
        loadComponent: () =>
          import('./pages/resumen-mensual-page/resumen-mensual-page.component').then(
            (m) => m.ResumenMensualPageComponent,
          ),
        title: 'Resumen general — SISRH-INDECI',
      },

      /* ——— Tablero Consolidado (F3.5) ——— */
      {
        path: 'consolidado',
        loadComponent: () =>
          import('./pages/reportes-consolidado-page/reportes-consolidado-page.component').then(
            (m) => m.ReportesConsolidadoPageComponent,
          ),
        title: 'Tablero consolidado — SISRH-INDECI',
      },

      /* ——— Resumen por meta presupuestal (PANTALLA-05) ——— */
      {
        path: 'resumen-meta',
        loadComponent: () =>
          import('./pages/resumen-meta-page/resumen-meta-page.component').then(
            (m) => m.ResumenMetaPageComponent,
          ),
        title: 'Resumen por meta — SISRH-INDECI',
      },

      /* ——— Conciliación AIRHSP (PANTALLA-06) ——— */
      {
        path: 'conciliacion',
        loadComponent: () =>
          import('./pages/conciliacion-page/conciliacion-page.component').then(
            (m) => m.ConciliacionPageComponent,
          ),
        title: 'Conciliación AIRHSP — SISRH-INDECI',
      },

      /* ——— Archivo de bancos (PANTALLA-07) ——— */
      {
        path: 'archivo-bancos',
        loadComponent: () =>
          import('./pages/archivo-bancos-page/archivo-bancos-page.component').then(
            (m) => m.ArchivoBancosPageComponent,
          ),
        title: 'Archivo de bancos — SISRH-INDECI',
      },

      /* ——— Exportar Excel (T162) — stub ——— */
      {
        path: 'exportar-excel',
        loadComponent: () =>
          import('./pages/exportar-excel-page/exportar-excel-page.component').then(
            (m) => m.ExportarExcelPageComponent,
          ),
        title: 'Exportar Excel — SISRH-INDECI',
      },

      /* ——— Historial empleado (T163) — stub ——— */
      {
        path: 'historial',
        loadComponent: () =>
          import('./pages/historial-empleado-page/historial-empleado-page.component').then(
            (m) => m.HistorialEmpleadoPageComponent,
          ),
        title: 'Historial de empleado — SISRH-INDECI',
      },
    ],
  },
];
