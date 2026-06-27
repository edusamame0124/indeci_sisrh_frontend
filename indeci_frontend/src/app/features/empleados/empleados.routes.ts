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
      {
        path: 'datos/:personaId',
        loadComponent: () =>
          import('./pages/empleado-datos-integrados-page/empleado-datos-integrados-page.component').then(
            (m) => m.EmpleadoDatosIntegradosPageComponent,
          ),
        title: 'Datos del Empleado — SISRH-INDECI',
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

      /* ——— Datos tributarios: Suspensión de 4ta (FASE 1) ——— */
      {
        path: 'suspension-4ta',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./components/empleado-seleccion-hub/empleado-seleccion-hub.component').then(
                (m) => m.EmpleadoSeleccionHubComponent,
              ),
            title: 'Suspensión de 4ta — SISRH-INDECI',
            data: {
              empleadosHub: {
                title: 'Suspensión de retención de 4ta',
                subtitle:
                  'Selecciona una persona para registrar o revisar su constancia SUNAT de suspensión de 4ta (CAS).',
                segment: 'suspension-4ta',
                showRegimen: true,
              },
            },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import(
                './pages/empleado-suspension4ta-page/empleado-suspension4ta-page.component'
              ).then((m) => m.EmpleadoSuspension4taPageComponent),
            title: 'Suspensión de 4ta por persona — SISRH-INDECI',
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
                title: 'Configuración de planilla',
                subtitle: 'Selecciona una persona para ver o registrar su configuración remunerativa.',
                segment: 'planilla',
              },
            },
          },
          {
            path: 'personas/:personaId',
            loadComponent: () =>
              import('./pages/empleado-planilla-list-page/empleado-planilla-list-page.component').then(
                (m) => m.EmpleadoPlanillaListPageComponent,
              ),
            title: 'Planilla — SISRH-INDECI',
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

      /* ——— Ficha 360 del Empleado (F3.1) ——— */
      {
        path: 'ficha',
        loadComponent: () =>
          import('./pages/ficha-selector-page/ficha-selector-page.component').then(
            (m) => m.FichaSelectorPageComponent,
          ),
        title: 'Ficha 360 — Seleccionar empleado — SISRH-INDECI',
      },
      {
        path: 'ficha/:empleadoId/:periodo',
        loadComponent: () =>
          import('./pages/ficha-360-page/ficha-360-page.component').then(
            (m) => m.Ficha360PageComponent,
          ),
        title: 'Ficha 360 del Empleado — SISRH-INDECI',
      },

      /* ——— Eventos del Período (F3.6) ——— */
      {
        path: 'eventos',
        loadComponent: () =>
          import('./pages/eventos-periodo-page/eventos-periodo-page.component').then(
            (m) => m.EventosPeriodoPageComponent,
          ),
        title: 'Eventos del período — SISRH-INDECI',
      },

      /* ——— Cargo histórico timeline (F5.1) ——— */
      {
        path: 'cargo-historico',
        loadComponent: () =>
          import('./pages/cargo-historico-page/cargo-historico-page.component').then(
            (m) => m.CargoHistoricoPageComponent,
          ),
        title: 'Cargo histórico — SISRH-INDECI',
      },

      /* ——— Encargaturas (F5.2) ——— */
      {
        path: 'encargatura',
        loadComponent: () =>
          import('./pages/encargatura-page/encargatura-page.component').then(
            (m) => m.EncargaturaPageComponent,
          ),
        title: 'Encargaturas — SISRH-INDECI',
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
