import { Routes } from '@angular/router';
import { catalogosAccessGuard } from '../../core/guards/catalogos-access.guard';

export const CATALOGOS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [catalogosAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bancos' },
      {
        path: 'bancos',
        loadComponent: () =>
          import('./pages/banco-catalog-page/banco-catalog-page.component').then(
            (m) => m.BancoCatalogPageComponent,
          ),
        title: 'Bancos — Catálogos — SISRH-INDECI',
      },
      {
        path: 'tipos-cuenta',
        loadComponent: () =>
          import('./pages/tipo-cuenta-catalog-page/tipo-cuenta-catalog-page.component').then(
            (m) => m.TipoCuentaCatalogPageComponent,
          ),
        title: 'Tipos de cuenta — Catálogos — SISRH-INDECI',
      },
      {
        path: 'ubigeo',
        loadComponent: () =>
          import('./pages/ubigeo-browse-page/ubigeo-browse-page.component').then(
            (m) => m.UbigeoBrowsePageComponent,
          ),
        title: 'Ubigeo — Catálogos — SISRH-INDECI',
      },
      {
        path: 'sexo',
        loadComponent: () =>
          import('./pages/sexo-catalog-page/sexo-catalog-page.component').then(
            (m) => m.SexoCatalogPageComponent,
          ),
        title: 'Sexo — Catálogos — SISRH-INDECI',
      },
      {
        path: 'estado-civil',
        loadComponent: () =>
          import('./pages/estado-civil-catalog-page/estado-civil-catalog-page.component').then(
            (m) => m.EstadoCivilCatalogPageComponent,
          ),
        title: 'Estado civil — Catálogos — SISRH-INDECI',
      },
      {
        path: 'tipo-documento',
        loadComponent: () =>
          import('./pages/tipo-documento-catalog-page/tipo-documento-catalog-page.component').then(
            (m) => m.TipoDocumentoCatalogPageComponent,
          ),
        title: 'Tipo de documento — Catálogos — SISRH-INDECI',
      },
      {
        path: 'tipo-personal',
        loadComponent: () =>
          import('./pages/tipo-personal-catalog-page/tipo-personal-catalog-page.component').then(
            (m) => m.TipoPersonalCatalogPageComponent,
          ),
        title: 'Tipo de personal — Catálogos — SISRH-INDECI',
      },
      {
        path: 'profesion',
        loadComponent: () =>
          import('./pages/profesion-catalog-page/profesion-catalog-page.component').then(
            (m) => m.ProfesionCatalogPageComponent,
          ),
        title: 'Profesión — Catálogos — SISRH-INDECI',
      },
      {
        path: 'grado-academico',
        loadComponent: () =>
          import(
            './pages/grado-academico-catalog-page/grado-academico-catalog-page.component'
          ).then((m) => m.GradoAcademicoCatalogPageComponent),
        title: 'Grado académico — Catálogos — SISRH-INDECI',
      },
      {
        path: 'nivel',
        loadComponent: () =>
          import('./pages/nivel-catalog-page/nivel-catalog-page.component').then(
            (m) => m.NivelCatalogPageComponent,
          ),
        title: 'Nivel — Catálogos — SISRH-INDECI',
      },
      {
        path: 'sede',
        loadComponent: () =>
          import('./pages/sede-catalog-page/sede-catalog-page.component').then(
            (m) => m.SedeCatalogPageComponent,
          ),
        title: 'Sede — Catálogos — SISRH-INDECI',
      },
      {
        path: 'oficina',
        loadComponent: () =>
          import('./pages/oficina-catalog-page/oficina-catalog-page.component').then(
            (m) => m.OficinaCatalogPageComponent,
          ),
        title: 'Oficina — Catálogos — SISRH-INDECI',
      },
      {
        path: 'dependencia',
        loadComponent: () =>
          import('./pages/dependencia-catalog-page/dependencia-catalog-page.component').then(
            (m) => m.DependenciaCatalogPageComponent,
          ),
        title: 'Dependencia — Catálogos — SISRH-INDECI',
      },
      {
        path: 'estructura-organica',
        loadComponent: () =>
          import(
            './pages/estructura-organica-catalog-page/estructura-organica-catalog-page.component'
          ).then((m) => m.EstructuraOrganicaCatalogPageComponent),
        title: 'Estructura orgánica — Catálogos — SISRH-INDECI',
      },
      {
        path: 'regimen-laboral',
        loadComponent: () =>
          import(
            './pages/regimen-laboral-catalog-page/regimen-laboral-catalog-page.component'
          ).then((m) => m.RegimenLaboralCatalogPageComponent),
        title: 'Régimen laboral — Catálogos — SISRH-INDECI',
      },
      {
        path: 'tipo-contrato',
        loadComponent: () =>
          import('./pages/tipo-contrato-catalog-page/tipo-contrato-catalog-page.component').then(
            (m) => m.TipoContratoCatalogPageComponent,
          ),
        title: 'Tipo de contrato — Catálogos — SISRH-INDECI',
      },
      {
        path: 'condicion-laboral',
        loadComponent: () =>
          import(
            './pages/condicion-laboral-catalog-page/condicion-laboral-catalog-page.component'
          ).then((m) => m.CondicionLaboralCatalogPageComponent),
        title: 'Condición laboral — Catálogos — SISRH-INDECI',
      },
      {
        path: 'regimen-pensionario',
        loadComponent: () =>
          import(
            './pages/regimen-pensionario-catalog-page/regimen-pensionario-catalog-page.component'
          ).then((m) => m.RegimenPensionarioCatalogPageComponent),
        title: 'Régimen pensionario — Catálogos — SISRH-INDECI',
      },
      {
        path: 'tipo-comision-afp',
        loadComponent: () =>
          import(
            './pages/tipo-comision-afp-catalog-page/tipo-comision-afp-catalog-page.component'
          ).then((m) => m.TipoComisionAfpCatalogPageComponent),
        title: 'Tipo de comisión AFP — Catálogos — SISRH-INDECI',
      },
      {
        path: 'conceptos-planilla',
        loadComponent: () =>
          import(
            './pages/concepto-planilla-catalog-page/concepto-planilla-catalog-page.component'
          ).then((m) => m.ConceptoPlanillaCatalogPageComponent),
        title: 'Conceptos de planilla — Catálogos — SISRH-INDECI',
      },
    ],
  },
];
