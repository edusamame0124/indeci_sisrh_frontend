import { Routes } from '@angular/router';
import { planillaAccessGuard } from '../../core/guards/planilla-access.guard';

/**
 * Rutas Módulo 3 — Planilla electrónica (Spec 009 / T159).
 * Por ahora solo `periodos` está implementada (T152). Las demás llegan con T153-T158.
 */
export const PLANILLA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [planillaAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'periodos' },

      /* ——— Centro de Validaciones (F3.3) ——— */
      {
        path: 'validaciones',
        loadComponent: () =>
          import('./pages/validaciones-centro-page/validaciones-centro-page.component').then(
            (m) => m.ValidacionesCentroPageComponent,
          ),
        title: 'Centro de Validaciones — SISRH-INDECI',
      },

      /* ——— Asistente de Recálculo (F3.4) ——— */
      {
        path: 'recalculo',
        loadComponent: () =>
          import('./pages/recalculo-wizard-page/recalculo-wizard-page.component').then(
            (m) => m.RecalculoWizardPageComponent,
          ),
        title: 'Asistente de Recálculo — SISRH-INDECI',
      },

      /* ——— Periodos (T152) ——— */
      {
        path: 'periodos',
        loadComponent: () =>
          import('./pages/periodos-page/periodos-page.component').then(
            (m) => m.PeriodosPageComponent,
          ),
        title: 'Periodos de planilla — SISRH-INDECI',
      },

      /* ——— Generación masiva (T153) ——— */
      {
        path: 'generacion-masiva',
        loadComponent: () =>
          import('./pages/generacion-masiva-page/generacion-masiva-page.component').then(
            (m) => m.GeneracionMasivaPageComponent,
          ),
        title: 'Generación masiva — SISRH-INDECI',
      },

      /* ——— Generación individual (T154) ——— */
      {
        path: 'generacion-individual',
        loadComponent: () =>
          import('./pages/generacion-individual-page/generacion-individual-page.component').then(
            (m) => m.GeneracionIndividualPageComponent,
          ),
        title: 'Generación individual — SISRH-INDECI',
      },

      /* ——— Movimientos (T155) ——— */
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./pages/movimientos-page/movimientos-page.component').then(
            (m) => m.MovimientosPageComponent,
          ),
        title: 'Movimientos de planilla — SISRH-INDECI',
      },

      /* ——— Detalle :empleadoId/:periodo (T156) ——— */
      {
        path: 'detalle/:empleadoId/:periodo',
        loadComponent: () =>
          import('./pages/detalle-page/detalle-page.component').then(
            (m) => m.DetallePageComponent,
          ),
        title: 'Detalle de planilla — SISRH-INDECI',
      },

      /* ——— Resumen :empleadoId/:periodo (T157) ——— */
      {
        path: 'resumen/:empleadoId/:periodo',
        loadComponent: () =>
          import('./pages/resumen-page/resumen-page.component').then(
            (m) => m.ResumenPageComponent,
          ),
        title: 'Resumen de planilla — SISRH-INDECI',
      },

      /* ——— Cierre de periodo (T158) ——— */
      {
        path: 'cierre/:id',
        loadComponent: () =>
          import('./pages/cierre-periodo-page/cierre-periodo-page.component').then(
            (m) => m.CierrePeriodoPageComponent,
          ),
        title: 'Cerrar periodo — SISRH-INDECI',
      },

      /* ——— Semáforo presupuestal :id (Spec 012 / C1 · P-05) ——— */
      {
        path: 'presupuesto/:id',
        loadComponent: () =>
          import('./pages/semaforo-presupuestal-page/semaforo-presupuestal-page.component').then(
            (m) => m.SemaforoPresupuestalPageComponent,
          ),
        title: 'Semáforo presupuestal — SISRH-INDECI',
      },

      /* ——— Exportación PLAME / PDT 601 (B3 / M09) — UI visual pendiente ——— */
      {
        path: 'plame',
        loadComponent: () =>
          import('./pages/plame-export-page/plame-export-page.component').then(
            (m) => m.PlameExportPageComponent,
          ),
        title: 'Exportación PLAME — SISRH-INDECI',
      },

      /* ——— Exportación MCPP Web (B3 / M14) — UI visual pendiente ——— */
      {
        path: 'mcpp',
        loadComponent: () =>
          import('./pages/mcpp-export-page/mcpp-export-page.component').then(
            (m) => m.McppExportPageComponent,
          ),
        title: 'Exportación MCPP — SISRH-INDECI',
      },

      /* ——— Suspensiones / Licencias (B3 / M09 — fuente del .snl) — UI visual pendiente ——— */
      {
        path: 'suspensiones',
        loadComponent: () =>
          import('./pages/suspension-list-page/suspension-list-page.component').then(
            (m) => m.SuspensionListPageComponent,
          ),
        title: 'Suspensiones y licencias — SISRH-INDECI',
      },

      /* ——— Configuración Anual CAS ——— */
      {
        path: 'configuracion-cas',
        loadComponent: () =>
          import('./pages/configuracion-cas-page/configuracion-cas-page.component').then(
            (m) => m.ConfiguracionCasPageComponent,
          ),
        title: 'Configuración Anual — SISRH-INDECI',
      },

      /* ——— Metas presupuestales anuales (V010_77) ——— */
      {
        path: 'metas',
        loadComponent: () =>
          import('./pages/metas-presupuestales-page/metas-presupuestales-page.component').then(
            (m) => m.MetasPresupuestalesPageComponent,
          ),
        title: 'Metas presupuestales — SISRH-INDECI',
      },
    ],
  },
];
