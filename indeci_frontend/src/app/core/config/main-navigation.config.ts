import type { MainNavItem, MainNavChildItem } from '../models/main-nav-item.model';
import { flattenNavLeaves } from '../models/main-nav-item.model';
import { ADMIN_MODULE_ACCESS_ROLES } from '../guards/admin-access.guard';
import { CATALOGOS_ACCESS_ROLES } from '../guards/catalogos-access.guard';
import { REPORTES_ACCESS_ROLES } from '../guards/reportes-access.guard';
import { EMPLEADOS_ACCESS_ROLES } from './empleados-access-roles';
import { PLANILLA_OPERATIVA_ROLES } from './sisrh-roles.config';

/**
 * Menú lateral principal (shell post-login).
 * Fase 5: catálogos agrupados en 4 sub-expansiones + íconos únicos por ítem.
 * Las rutas no cambian; los guards de ruta siguen siendo la fuente de verdad.
 */
export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  { label: 'Inicio', route: '/', icon: 'home' },

  {
    label: 'Catálogos',
    route: '',
    icon: 'menu_book',
    requiredAnyRole: [...CATALOGOS_ACCESS_ROLES],
    children: [
      {
        label: 'Referencia',
        icon: 'library_books',
        children: [
          { label: 'Bancos', route: '/catalogos/bancos', icon: 'account_balance' },
          { label: 'Tipos de cuenta', route: '/catalogos/tipos-cuenta', icon: 'category' },
          { label: 'Ubigeo', route: '/catalogos/ubigeo', icon: 'map' },
        ],
      },
      {
        label: 'Persona y académico',
        icon: 'person_search',
        children: [
          { label: 'Sexo', route: '/catalogos/sexo', icon: 'wc' },
          { label: 'Estado civil', route: '/catalogos/estado-civil', icon: 'favorite' },
          { label: 'Tipo de documento', route: '/catalogos/tipo-documento', icon: 'fingerprint' },
          { label: 'Tipo de personal', route: '/catalogos/tipo-personal', icon: 'engineering' },
          { label: 'Profesión', route: '/catalogos/profesion', icon: 'school' },
          {
            label: 'Grado académico',
            route: '/catalogos/grado-academico',
            icon: 'workspace_premium',
          },
          { label: 'Nivel', route: '/catalogos/nivel', icon: 'stairs' },
        ],
      },
      {
        label: 'Organización',
        icon: 'corporate_fare',
        children: [
          { label: 'Sede', route: '/catalogos/sede', icon: 'business' },
          { label: 'Oficina', route: '/catalogos/oficina', icon: 'meeting_room' },
          { label: 'Dependencia', route: '/catalogos/dependencia', icon: 'domain' },
          {
            label: 'Estructura orgánica',
            route: '/catalogos/estructura-organica',
            icon: 'account_tree',
          },
        ],
      },
      {
        label: 'Planilla y legal',
        icon: 'gavel',
        children: [
          { label: 'Régimen laboral', route: '/catalogos/regimen-laboral', icon: 'work' },
          { label: 'Tipo de contrato', route: '/catalogos/tipo-contrato', icon: 'description' },
          { label: 'Condición laboral', route: '/catalogos/condicion-laboral', icon: 'rule' },
          {
            label: 'Régimen pensionario',
            route: '/catalogos/regimen-pensionario',
            icon: 'account_balance_wallet',
          },
          { label: 'Tipo de comisión AFP', route: '/catalogos/tipo-comision-afp', icon: 'percent' },

        ],
      },
    ],
  },

  {
    label: 'Módulo Vinculación',
    route: '',
    icon: 'people',
    requiredAnyRole: [...EMPLEADOS_ACCESS_ROLES],
    children: [
      { label: 'Datos personales', route: '/empleados/personas', icon: 'person' },
      { label: 'Eventos del período', route: '/empleados/eventos', icon: 'event_note' },
      { label: 'Ficha 360', route: '/empleados/ficha', icon: 'manage_search' },
    ],
  },

  {
    label: 'Gestiones del personal',
    route: '',
    icon: 'manage_accounts',
    requiredAnyRole: [...EMPLEADOS_ACCESS_ROLES],
    children: [
      { label: 'Gestión del empleado', route: '/gestiones-personal/empleado', icon: 'badge' },
      {
        label: 'Gestión del jefe inmediato',
        route: '/gestiones-personal/jefe-inmediato',
        icon: 'supervisor_account',
      },
      { label: 'Gestión de RRHH', route: '/gestiones-personal/rrhh', icon: 'diversity_3' },
    ],
  },

  {
    label: 'Legajo Personal',
    route: '',
    icon: 'folder_shared',
    requiredAnyRole: [...EMPLEADOS_ACCESS_ROLES],
    children: [
      {
        label: 'Legajo',
        route: '/legajo',
        icon: 'folder_shared',
      },
    ],
  },
  {
    label: 'Teletrabajo',
    route: '',
    icon: 'folder_shared',
    requiredAnyRole: [...EMPLEADOS_ACCESS_ROLES],
    children: [
      {
        label: 'teletrabajo',
        route: '/teletrabajo',
        icon: 'folder_shared',
      },
    ],
  },
  {
    label: 'Mis asistencias',
    route: '',
    icon: 'folder_shared',
    requiredAnyRole: [...EMPLEADOS_ACCESS_ROLES],
    children: [
      {
        label: 'Mis Asistencias',
        route: '/asistencia-empleado/mis-asistencias',
        icon: 'event_available',
      },
    ],
  },

  {
    label: 'Planilla',
    route: '',
    icon: 'calculate',
    requiredAnyRole: [...PLANILLA_OPERATIVA_ROLES],
    children: [
      { label: 'Configuración Anual', route: '/planilla/configuracion-cas', icon: 'settings', sectionHeader: 'Configuración' },
      { label: 'Conceptos de Planilla', route: '/planilla/conceptos', icon: 'receipt_long' },
      { label: 'Periodos', route: '/planilla/periodos', icon: 'event', sectionHeader: 'OPERACIÓN MENSUAL' },
      { label: 'Carga de asistencia', route: '/asistencia/carga', icon: 'event_available' },
      {
        label: 'Subsidios (Enfermedad/Maternidad)',
        route: '/asistencia/subsidios',
        icon: 'medical_services',
      },
      { label: 'Suspensiones / Licencias', route: '/planilla/suspensiones', icon: 'event_busy' },

      { label: 'Centro de Validaciones', route: '/planilla/validaciones', icon: 'rule', sectionHeader: 'PROCESAR PLANILLA' },
      { label: 'Generación masiva', route: '/planilla/generacion-masiva', icon: 'group_work' },
      { label: 'Generación individual', route: '/planilla/generacion-individual', icon: 'person_add' },
      { label: 'Asistente de Recálculo', route: '/planilla/recalculo', icon: 'tune' },
      { label: 'Movimientos', route: '/planilla/movimientos', icon: 'list', sectionHeader: 'Resultados' },
      { label: 'MCPP', route: '/planilla/mcpp', icon: 'receipt' },
    ],
  },

  {
    label: 'Reportes',
    route: '',
    icon: 'assessment',
    requiredAnyRole: [...REPORTES_ACCESS_ROLES],
    children: [
      { label: 'Resumen general', route: '/reportes/resumen-mensual', icon: 'bar_chart' },
      { label: 'Tablero consolidado', route: '/reportes/consolidado', icon: 'insights' },
      { label: 'Resumen por meta', route: '/reportes/resumen-meta', icon: 'donut_small' },
      { label: 'Conciliación AIRHSP', route: '/reportes/conciliacion', icon: 'fact_check' },
      { label: 'Archivo de bancos', route: '/reportes/archivo-bancos', icon: 'account_balance' },
      { label: 'Exportar Excel', route: '/reportes/exportar-excel', icon: 'table_view' },
      { label: 'Historial empleado', route: '/reportes/historial', icon: 'history_edu' },
    ],
  },

  {
    label: 'Administración',
    route: '',
    icon: 'admin_panel_settings',
    requiredAnyRole: [...ADMIN_MODULE_ACCESS_ROLES],
    children: [
      { label: 'Usuarios', route: '/admin/usuarios', icon: 'group' },
      { label: 'Roles', route: '/admin/roles', icon: 'verified_user' },
      { label: 'Permisos', route: '/admin/permisos', icon: 'key' },
      { label: 'Auditoría', route: '/admin/auditoria', icon: 'history' },
    ],
  },

  {
    label: 'Portal del empleado',
    route: '/portal-empleado',
    icon: 'person_pin',
    requiredAnyRole: [...EMPLEADOS_ACCESS_ROLES],
  },
];

/** Filtra sub-ítems por texto (sidebar Catálogos). */
export function filterNavChildrenByQuery(
  children: readonly MainNavChildItem[],
  query: string,
): readonly MainNavChildItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return children;

  const out: MainNavChildItem[] = [];
  for (const child of children) {
    if (child.children?.length) {
      const filtered = filterNavChildrenByQuery(child.children, q);
      if (filtered.length > 0) {
        out.push({ ...child, children: filtered });
      }
    } else if (child.label.toLowerCase().includes(q)) {
      out.push(child);
    }
  }
  return out;
}

function pruneNavChildren(children: readonly MainNavChildItem[]): readonly MainNavChildItem[] {
  const pruned: MainNavChildItem[] = [];
  for (const child of children) {
    if (child.children?.length) {
      const nested = pruneNavChildren(child.children);
      if (nested.length > 0) {
        pruned.push({ ...child, children: nested });
      }
    } else if (child.route) {
      pruned.push(child);
    }
  }
  return pruned;
}

export function filterVisibleNavItems(
  items: readonly MainNavItem[],
  userPermissions: readonly string[],
  userRoles: readonly string[],
): MainNavItem[] {
  const pSet = new Set(userPermissions);
  const rSet = new Set(userRoles);
  const visible: MainNavItem[] = [];

  for (const item of items) {
    const reqs = item.requiredPermissions;
    if (reqs?.length && !reqs.every((p) => pSet.has(p))) continue;

    const anyRoles = item.requiredAnyRole;
    if (anyRoles?.length && !anyRoles.some((r) => rSet.has(r))) continue;

    if (item.children?.length) {
      const children = pruneNavChildren(item.children);
      if (children.length === 0) continue;
      visible.push({ ...item, children });
    } else {
      visible.push(item);
    }
  }

  return visible;
}

/** Total de enlaces hoja bajo Catálogos (tests y validación). */
export function catalogLeafCount(items: readonly MainNavItem[] = MAIN_NAV_ITEMS): number {
  const cat = items.find((i) => i.label === 'Catálogos');
  return flattenNavLeaves(cat?.children).length;
}
