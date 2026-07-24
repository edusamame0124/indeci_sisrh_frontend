import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';

/**
 * Rutas del Portal del Empleado (SPEC §12.2 PANTALLA-08).
 * Autoservicio: usa `empleadosAccessGuard` (incluye PORTAL_PAPELETAS_ROLES —
 * EMPLEADO, JEFE, RRHH_PAPELETA — además de los roles operativos). No usar
 * `planillaAccessGuard`: ese excluye deliberadamente EMPLEADO/JEFE/RRHH_PAPELETA
 * por ser el guard del módulo operativo de Planilla (MCPP, Suspensiones, Cierre).
 */
export const PORTAL_EMPLEADO_ROUTES: Routes = [
  {
    path: 'mi-perfil',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import(
        './pages/mi-perfil-page/mi-perfil-page.component'
      ).then((m) => m.MiPerfilPageComponent),
    title: 'Mi perfil — SISRH-INDECI',
  },
  {
    path: '',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import(
        './pages/portal-empleado-page/portal-empleado-page.component'
      ).then((m) => m.PortalEmpleadoPageComponent),
    title: 'Portal del empleado — SISRH-INDECI',
  },
];
