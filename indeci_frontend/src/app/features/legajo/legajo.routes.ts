import { Routes } from '@angular/router';
import { empleadosAccessGuard } from '../../core/guards/empleados-access.guard';
import { LEGAJO_DEFAULT_SECTION_ROUTE } from './config/legajo-sections.config';

export const LEGAJO_ROUTES: Routes = [
  {
    path: '',
    canActivate: [empleadosAccessGuard],
    loadComponent: () =>
      import('./pages/legajo-shell-page/legajo-shell-page.component').then(
        (m) => m.LegajoShellPageComponent,
      ),
    title: 'Legajo Personal — SISRH-INDECI',
    children: [
      { path: '', pathMatch: 'full', redirectTo: LEGAJO_DEFAULT_SECTION_ROUTE },
      {
        path: 'datos-generales',
        loadComponent: () =>
          import('./components/legajo-datos-generales/legajo-datos-generales.component').then(
            (m) => m.LegajoDatosGeneralesComponent,
          ),
        title: 'Datos Generales — Legajo — SISRH-INDECI',
      },
      {
        path: 'vinculacion-laboral',
        loadComponent: () =>
          import('./components/legajo-vinculacion-laboral/legajo-vinculacion-laboral.component').then(
            (m) => m.LegajoVinculacionLaboralComponent,
          ),
        title: 'Vinculación Laboral — Legajo — SISRH-INDECI',
      },
      {
        path: 'formacion-desarrollo',
        loadComponent: () =>
          import('./components/legajo-formacion-desarrollo/legajo-formacion-desarrollo.component').then(
            (m) => m.LegajoFormacionDesarrolloComponent,
          ),
        title: 'Formación y Desarrollo — Legajo — SISRH-INDECI',
      },
      {
        path: 'trayectoria-laboral',
        loadComponent: () =>
          import('./components/legajo-trayectoria-laboral/legajo-trayectoria-laboral.component').then(
            (m) => m.LegajoTrayectoriaLaboralComponent,
          ),
        title: 'Trayectoria Laboral — Legajo — SISRH-INDECI',
      },
      {
        path: 'compensaciones-beneficios',
        loadComponent: () =>
          import(
            './components/legajo-compensaciones-beneficios/legajo-compensaciones-beneficios.component'
          ).then((m) => m.LegajoCompensacionesBeneficiosComponent),
        title: 'Compensaciones y Beneficios — Legajo — SISRH-INDECI',
      },
      {
        path: 'evaluacion-carrera',
        loadComponent: () =>
          import('./components/legajo-evaluacion-carrera/legajo-evaluacion-carrera.component').then(
            (m) => m.LegajoEvaluacionCarreraComponent,
          ),
        title: 'Evaluación y Desarrollo de Carrera — Legajo — SISRH-INDECI',
      },
      {
        path: 'disciplina-reconocimientos',
        loadComponent: () =>
          import(
            './components/legajo-disciplina-reconocimientos/legajo-disciplina-reconocimientos.component'
          ).then((m) => m.LegajoDisciplinaReconocimientosComponent),
        title: 'Disciplina y Reconocimientos — Legajo — SISRH-INDECI',
      },
      {
        path: 'relaciones-laborales',
        loadComponent: () =>
          import('./components/legajo-relaciones-laborales/legajo-relaciones-laborales.component').then(
            (m) => m.LegajoRelacionesLaboralesComponent,
          ),
        title: 'Relaciones Laborales — Legajo — SISRH-INDECI',
      },
      {
        path: 'seguridad-salud-bienestar',
        loadComponent: () =>
          import(
            './components/legajo-seguridad-salud-bienestar/legajo-seguridad-salud-bienestar.component'
          ).then((m) => m.LegajoSeguridadSaludBienestarComponent),
        title: 'Seguridad, Salud y Bienestar — Legajo — SISRH-INDECI',
      },
      {
        path: 'desvinculacion',
        loadComponent: () =>
          import('./components/legajo-desvinculacion/legajo-desvinculacion.component').then(
            (m) => m.LegajoDesvinculacionComponent,
          ),
        title: 'Desvinculación — Legajo — SISRH-INDECI',
      },
      {
        path: 'documentos-complementarios',
        loadComponent: () =>
          import(
            './components/legajo-documentos-complementarios/legajo-documentos-complementarios.component'
          ).then((m) => m.LegajoDocumentosComplementariosComponent),
        title: 'Documentos Complementarios — Legajo — SISRH-INDECI',
      },
    ],
  },
];
