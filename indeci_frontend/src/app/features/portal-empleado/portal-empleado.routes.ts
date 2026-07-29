import { Routes } from '@angular/router';
import { autoservicioGuard } from '../../core/guards/autoservicio.guard';

/**
 * Rutas del Portal del Empleado (SPEC §12.2 PANTALLA-08).
 * RBAC V012_45: autoservicio estricto — "Mi perfil" lo ve únicamente el rol
 * `EMPLEADO`, no los roles operativos (PLANILLA, VINCULACION, ASISTENCIA,
 * RRHH_ADMIN), que acceden a los datos de terceros por sus propios módulos.
 */
export const PORTAL_EMPLEADO_ROUTES: Routes = [
  {
    path: 'mi-perfil',
    canActivate: [autoservicioGuard],
    loadComponent: () =>
      import(
        './pages/mi-perfil-page/mi-perfil-page.component'
      ).then((m) => m.MiPerfilPageComponent),
    title: 'Mi perfil — SISRH-INDECI',
  },
  {
    path: '',
    canActivate: [autoservicioGuard],
    loadComponent: () =>
      import(
        './pages/portal-empleado-page/portal-empleado-page.component'
      ).then((m) => m.PortalEmpleadoPageComponent),
    title: 'Portal del empleado — SISRH-INDECI',
  },
];
