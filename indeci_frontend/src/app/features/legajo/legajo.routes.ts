import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';
import { planillaAccessGuard } from '../../core/guards/planilla-access.guard';

export const LEGAJO_ROUTES: Routes = [
  {
    // Autoservicio — EMPLEADO/JEFE/RRHH_PAPELETA deben poder entrar.
    path: 'mi-legajo',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import('./pages/mi-legajo-page/mi-legajo-page').then(
        (m) => m.MiLegajoPage,
      ),
    title: 'Mi legajo — SISRH-INDECI',
  },
  {
    // Operativo RRHH/TI — legajo de TODOS los empleados, no autoservicio.
    path: '',
    canActivate: [planillaAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-list-page/legajo-list-page/legajo-list-page').then(
        (m) => m.LegajoListPage,
      ),
    title: 'Legajo Personal — SISRH-INDECI',
  },
  {
    // Operativo RRHH/TI — detalle del legajo de CUALQUIER persona.
    path: ':personaId',
    canActivate: [planillaAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-detalle-page/legajo-detalle-page/legajo-detalle-page').then(
        (m) => m.LegajoDetallePage,
      ),
    title: 'Detalle de Legajo — SISRH-INDECI',
  },
];