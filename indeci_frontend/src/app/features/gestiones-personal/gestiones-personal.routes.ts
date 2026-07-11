import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';
import { requirePermisos } from '../../core/guards/permiso-access.guard';

/**
 * Rutas del módulo "Gestiones del personal".
 * Agrupa las gestiones del empleado, del jefe inmediato y de RRHH.
 * Reutiliza el mismo set de roles que el módulo Empleados (`empleadosAccessGuard`).
 */
export const GESTIONES_PERSONAL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [empleadosAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empleado' },

      {
        path: 'empleado',
        loadComponent: () =>
          import('./pages/gestion-empleado-page/gestion-empleado-page.component').then(
            (m) => m.GestionEmpleadoPageComponent,
          ),
        title: 'Gestión del empleado — SISRH-INDECI',
      },
      {
        path: 'jefe-inmediato',
        canActivate: [requirePermisos('PAP_JEFE')],
        loadComponent: () =>
          import('./pages/gestion-jefe-page/gestion-jefe-page.component').then(
            (m) => m.GestionJefePageComponent,
          ),
        title: 'Gestión del jefe inmediato — SISRH-INDECI',
      },
      {
        path: 'rrhh',
        canActivate: [requirePermisos('PAP_RRHH')],
        loadComponent: () =>
          import('./pages/gestion-rrhh-page/gestion-rrhh-page.component').then(
            (m) => m.GestionRrhhPageComponent,
          ),
        title: 'Gestión de RRHH — SISRH-INDECI',
      },
    ],
  },
];
