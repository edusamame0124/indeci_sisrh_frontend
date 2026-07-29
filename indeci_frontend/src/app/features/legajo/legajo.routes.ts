import { Routes } from '@angular/router';
import { autoservicioGuard } from '../../core/guards/autoservicio.guard';
import { vinculacionAccessGuard } from '../../core/guards/vinculacion-access.guard';

/**
 * RBAC V012_45: "Mi legajo" es autoservicio estricto (rol EMPLEADO); el legajo
 * de TODAS las personas pertenece al módulo Vinculación (rol VINCULACION).
 */
export const LEGAJO_ROUTES: Routes = [
  {
    // Autoservicio — el propio trabajador (rol EMPLEADO).
    path: 'mi-legajo',
    canActivate: [autoservicioGuard],
    loadComponent: () =>
      import('./pages/mi-legajo-page/mi-legajo-page').then(
        (m) => m.MiLegajoPage,
      ),
    title: 'Mi legajo — SISRH-INDECI',
  },
  {
    // Operativo — legajo de TODOS los empleados, no autoservicio.
    path: '',
    canActivate: [vinculacionAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-list-page/legajo-list-page/legajo-list-page').then(
        (m) => m.LegajoListPage,
      ),
    title: 'Legajo Personal — SISRH-INDECI',
  },
  {
    // Operativo — detalle del legajo de CUALQUIER persona.
    path: ':personaId',
    canActivate: [vinculacionAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-detalle-page/legajo-detalle-page/legajo-detalle-page').then(
        (m) => m.LegajoDetallePage,
      ),
    title: 'Detalle de Legajo — SISRH-INDECI',
  },
];