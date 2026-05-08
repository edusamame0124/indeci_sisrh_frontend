import { Routes } from '@angular/router';
import { adminAccessGuard } from '../../core/guards/admin-access.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [adminAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin-users-page/admin-users-page.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
        title: 'Usuarios — Administración — SISRH-INDECI',
      },
      {
        path: 'usuarios/nueva',
        loadComponent: () =>
          import('./pages/admin-user-new-page/admin-user-new-page.component').then(
            (m) => m.AdminUserNewPageComponent,
          ),
        title: 'Nuevo usuario — Administración — SISRH-INDECI',
      },
      {
        path: 'usuarios/:id',
        loadComponent: () =>
          import('./pages/admin-user-edit-page/admin-user-edit-page.component').then(
            (m) => m.AdminUserEditPageComponent,
          ),
        title: 'Usuario — Administración — SISRH-INDECI',
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/admin-roles-page/admin-roles-page.component').then(
            (m) => m.AdminRolesPageComponent,
          ),
        title: 'Roles — Administración — SISRH-INDECI',
      },
      {
        path: 'permisos',
        loadComponent: () =>
          import('./pages/admin-permisos-page/admin-permisos-page.component').then(
            (m) => m.AdminPermisosPageComponent,
          ),
        title: 'Permisos — Administración — SISRH-INDECI',
      },
      {
        path: 'auditoria',
        loadComponent: () =>
          import('./pages/admin-audit-page/admin-audit-page.component').then(
            (m) => m.AdminAuditPageComponent,
          ),
        title: 'Auditoría — Administración — SISRH-INDECI',
      },
    ],
  },
];
