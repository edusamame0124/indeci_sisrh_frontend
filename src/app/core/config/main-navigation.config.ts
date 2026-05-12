import type { MainNavItem } from '../models/main-nav-item.model';
import { ADMIN_MODULE_ACCESS_ROLES } from '../guards/admin-access.guard';
import { CATALOGOS_ACCESS_ROLES } from '../guards/catalogos-access.guard';
import { RRHH_ACCESS_ROLES_READONLY } from '../guards/rrhh-access.guard';

export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  { label: 'Inicio', route: '/', icon: 'home' },
  {
    label: 'Personas',
    route: '/rrhh/personas',
    icon: 'people',
    requiredAnyRole: [...RRHH_ACCESS_ROLES_READONLY],
  },
  {
    label: 'Cuentas bancarias',
    route: '/rrhh/cuentas-bancarias',
    icon: 'account_balance',
    requiredAnyRole: [...RRHH_ACCESS_ROLES_READONLY],
  },
  {
    label: 'Pensión',
    route: '/rrhh/pension',
    icon: 'savings',
    requiredAnyRole: [...RRHH_ACCESS_ROLES_READONLY],
  },
  {
    label: 'Planilla',
    route: '/rrhh/planilla',
    icon: 'payments',
    requiredAnyRole: [...RRHH_ACCESS_ROLES_READONLY],
  },
  {
    label: 'Puesto',
    route: '/rrhh/puesto',
    icon: 'badge',
    requiredAnyRole: [...RRHH_ACCESS_ROLES_READONLY],
  },
  {
    label: 'Catálogos',
    route: '',
    icon: 'menu_book',
    requiredAnyRole: [...CATALOGOS_ACCESS_ROLES],
    children: [
      { label: 'Bancos', route: '/catalogos/bancos', icon: 'account_balance' },
      { label: 'Tipos de cuenta', route: '/catalogos/tipos-cuenta', icon: 'category' },
      { label: 'Ubigeo', route: '/catalogos/ubigeo', icon: 'map' },
    ],
  },
  {
    label: 'Administración',
    route: '',
    icon: 'admin_panel_settings',
    requiredAnyRole: [...ADMIN_MODULE_ACCESS_ROLES],
    children: [
      { label: 'Usuarios', route: '/admin/usuarios', icon: 'group' },
      { label: 'Roles', route: '/admin/roles', icon: 'badge' },
      { label: 'Permisos', route: '/admin/permisos', icon: 'key' },
      { label: 'Auditoría', route: '/admin/auditoria', icon: 'history' },
    ],
  },
];

export function filterVisibleNavItems(
  items: readonly MainNavItem[],
  userPermissions: readonly string[],
  userRoles: readonly string[],
): MainNavItem[] {
  const pSet = new Set(userPermissions);
  const rSet = new Set(userRoles);
  return items.filter((item) => {
    const reqs = item.requiredPermissions;
    if (reqs?.length && !reqs.every((p) => pSet.has(p))) return false;

    const anyRoles = item.requiredAnyRole;
    if (anyRoles?.length && !anyRoles.some((r) => rSet.has(r))) return false;

    return true;
  });
}
