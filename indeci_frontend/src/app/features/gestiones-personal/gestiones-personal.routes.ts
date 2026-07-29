import { Routes } from '@angular/router';
import { gestionesPersonalGuard } from '../../core/guards/empleados-access.guard';
import { requirePermisos } from '../../core/guards/permiso-access.guard';

/**
 * Rutas del módulo "Gestiones del personal" (papeletas).
 * RBAC V012_45: es autoservicio — lo ven los roles del portal (`EMPLEADO`,
 * `JEFE`, `RRHH_PAPELETA`). Los sub-ítems se recortan además por permisos
 * `PAP_JEFE` / `PAP_RRHH`.
 */
export const GESTIONES_PERSONAL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [gestionesPersonalGuard],
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
