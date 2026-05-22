import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';

export const EMPLEADOS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [empleadosAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'personas' },

      /* ——— Personas (003) ——— */
      {
        path: 'personas',
        loadComponent: () =>
          import('./pages/persona-list-page/persona-list-page.component').then(
            (m) => m.PersonaListPageComponent,
          ),
        title: 'Personas — SISRH-INDECI',
      },
      {
        path: 'personas/nueva',
        loadComponent: () =>
          import('./pages/persona-form-page/persona-form-page.component').then(
            (m) => m.PersonaFormPageComponent,
          ),
        title: 'Nueva persona — SISRH-INDECI',
        data: { mode: 'create' as const },
      },
      {
        path: 'personas/:id/editar',
        loadComponent: () =>
          import('./pages/persona-form-page/persona-form-page.component').then(
            (m) => m.PersonaFormPageComponent,
          ),
        title: 'Editar persona — SISRH-INDECI',
        data: { mode: 'edit' as const },
      },
      {
        path: 'personas/:id',
        loadComponent: () =>
          import('./pages/persona-detail-page/persona-detail-page.component').then(
            (m) => m.PersonaDetailPageComponent,
          ),
        title: 'Ficha persona — SISRH-INDECI',
      },

      /* ——— Cuentas bancarias (004) ——— */
      {
        path: 'cuentas-bancarias',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/empleado-seleccion-hub/empleado-seleccion-hub.component').then(
                (m) => m.EmpleadoSeleccionHubComponent,
              ),
            title: 'Cuentas bancarias — SISRH-INDECI',
            data: {
              empleadosHub: {
                title: 'Cuentas bancarias',
                subtitle: 'Selecciona una persona para ver o registrar sus cuentas de abono.',
                segment: 'cuentas-bancarias',
              },
            },
          },
          {
            path: 'personas/:personaId/editar/:cuentaId',
            loadComponent: () =>
              import('./pages/empleado-banco-form-page/empleado-banco-form-page.component').then(
                (m) => m.EmpleadoBancoFormPageComponent,
              ),
            title: 'Editar cuenta — SISRH-INDECI',
            data: { mode: 'edit' as const },
          },
          {
            path: 'personas/:personaId/nueva',
            loadComponent: () =>
              import('./pages/empleado-banco-form-page/empleado-banco-form-page.component').then(
                (m) => m.EmpleadoBancoFormPageComponent,
              ),
            title: 'Nueva cuenta — SISRH-INDECI',
            data: { mode: 'create' as const },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import('./pages/empleado-banco-list-page/empleado-banco-list-page.component').then(
                (m) => m.EmpleadoBancoListPageComponent,
              ),
            title: 'Cuentas por persona — SISRH-INDECI',
          },
        ],
      },

      /* ——— Pensión (004) ——— */
      {
        path: 'pension',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/empleado-seleccion-hub/empleado-seleccion-hub.component').then(
                (m) => m.EmpleadoSeleccionHubComponent,
              ),
            title: 'Pensión — SISRH-INDECI',
            data: {
              empleadosHub: {
                title: 'Pensión',
                subtitle: 'Selecciona una persona para registrar o revisar AFP u ONP.',
                segment: 'pension',
              },
            },
          },
          {
            path: 'personas/:personaId/editar/:pensionId',
            loadComponent: () =>
              import('./pages/empleado-pension-form-page/empleado-pension-form-page.component').then(
                (m) => m.EmpleadoPensionFormPageComponent,
              ),
            title: 'Editar pensión — SISRH-INDECI',
            data: { mode: 'edit' as const },
          },
          {
            path: 'personas/:personaId/nueva',
            loadComponent: () =>
              import('./pages/empleado-pension-form-page/empleado-pension-form-page.component').then(
                (m) => m.EmpleadoPensionFormPageComponent,
              ),
            title: 'Nueva pensión — SISRH-INDECI',
            data: { mode: 'create' as const },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import('./pages/empleado-pension-list-page/empleado-pension-list-page.component').then(
                (m) => m.EmpleadoPensionListPageComponent,
              ),
            title: 'Pensión por persona — SISRH-INDECI',
          },
        ],
      },

      /* ——— Planilla (005) ——— */
      {
        path: 'planilla',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/empleado-seleccion-hub/empleado-seleccion-hub.component').then(
                (m) => m.EmpleadoSeleccionHubComponent,
              ),
            title: 'Planilla — SISRH-INDECI',
            data: {
              empleadosHub: {
                title: 'Planilla',
                subtitle: 'Selecciona una persona para registrar o revisar la planilla activa.',
                segment: 'planilla',
              },
            },
          },
          {
            path: 'personas/:personaId/editar/:planillaId',
            loadComponent: () =>
              import('./pages/empleado-planilla-form-page/empleado-planilla-form-page.component').then(
                (m) => m.EmpleadoPlanillaFormPageComponent,
              ),
            title: 'Editar configuración remunerativa — SISRH-INDECI',
            data: { mode: 'edit' as const },
          },
          {
            path: 'personas/:personaId/nueva',
            loadComponent: () =>
              import('./pages/empleado-planilla-form-page/empleado-planilla-form-page.component').then(
                (m) => m.EmpleadoPlanillaFormPageComponent,
              ),
            title: 'Nueva configuración remunerativa — SISRH-INDECI',
            data: { mode: 'create' as const },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import('./pages/empleado-planilla-list-page/empleado-planilla-list-page.component').then(
                (m) => m.EmpleadoPlanillaListPageComponent,
              ),
            title: 'Planilla por persona — SISRH-INDECI',
          },
        ],
      },

      /* ——— Puesto (005) ——— */
      {
        path: 'puesto',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/empleado-seleccion-hub/empleado-seleccion-hub.component').then(
                (m) => m.EmpleadoSeleccionHubComponent,
              ),
            title: 'Puesto — SISRH-INDECI',
            data: {
              empleadosHub: {
                title: 'Puesto',
                subtitle:
                  'Selecciona una persona para ver el historial de puesto o registrar un movimiento.',
                segment: 'puesto',
              },
            },
          },
          {
            path: 'personas/:personaId/editar/:puestoId',
            loadComponent: () =>
              import('./pages/empleado-puesto-form-page/empleado-puesto-form-page.component').then(
                (m) => m.EmpleadoPuestoFormPageComponent,
              ),
            title: 'Editar puesto — SISRH-INDECI',
            data: { mode: 'edit' as const },
          },
          {
            path: 'personas/:personaId/nueva',
            loadComponent: () =>
              import('./pages/empleado-puesto-form-page/empleado-puesto-form-page.component').then(
                (m) => m.EmpleadoPuestoFormPageComponent,
              ),
            title: 'Nuevo puesto — SISRH-INDECI',
            data: { mode: 'create' as const },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import('./pages/empleado-puesto-list-page/empleado-puesto-list-page.component').then(
                (m) => m.EmpleadoPuestoListPageComponent,
              ),
            title: 'Puesto por persona — SISRH-INDECI',
          },
        ],
      },

      /* ——— Préstamos (Spec 011 / B5) ——— */
      {
        path: 'prestamos',
        loadComponent: () =>
          import('./pages/prestamo-mantenimiento-page/prestamo-mantenimiento-page.component').then(
            (m) => m.PrestamoMantenimientoPageComponent,
          ),
        title: 'Préstamos — SISRH-INDECI',
      },

      /* ——— Vacaciones (Spec 011 / B5) ——— */
      {
        path: 'vacaciones',
        loadComponent: () =>
          import('./pages/vacacion-mantenimiento-page/vacacion-mantenimiento-page.component').then(
            (m) => m.VacacionMantenimientoPageComponent,
          ),
        title: 'Vacaciones — SISRH-INDECI',
      },

      /* ——— Conceptos asignados (009 — hub + lista; CRUD T140) ——— */
      {
        path: 'conceptos',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/empleado-seleccion-hub/empleado-seleccion-hub.component').then(
                (m) => m.EmpleadoSeleccionHubComponent,
              ),
            title: 'Conceptos asignados — SISRH-INDECI',
            data: {
              empleadosHub: {
                title: 'Conceptos asignados',
                subtitle: 'Selecciona una persona para revisar los conceptos de planilla asignados.',
                segment: 'conceptos',
              },
            },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import(
                './pages/empleado-conceptos-list-page/empleado-conceptos-list-page.component'
              ).then((m) => m.EmpleadoConceptosListPageComponent),
            title: 'Conceptos por persona — SISRH-INDECI',
          },
        ],
      },
    ],
  },
];
