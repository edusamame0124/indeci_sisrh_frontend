import type { MainNavItem, MainNavChildItem } from '../models/main-nav-item.model';
import { flattenNavLeaves } from '../models/main-nav-item.model';
import {
  ADMIN_MODULE_ACCESS_ROLES,
  ASISTENCIA_ACCESS_ROLES,
  AUTOSERVICIO_ROLES,
  CATALOGOS_ACCESS_ROLES,
  GESTIONES_PERSONAL_ROLES,
  PLANILLA_FULL_ROLES,
  PLANILLA_MENU_ROLES,
  REPORTES_ACCESS_ROLES,
  VINCULACION_ACCESS_ROLES,
} from './sisrh-roles.config';

/**
 * Menú lateral principal (shell post-login).
 *
 * RBAC V012_45 — un rol funcional por módulo:
 *   PLANILLA → Planilla (10/10), Catálogos (lectura), Reportes.
 *   ASISTENCIA → solo Periodos y Gestión de Asistencia dentro de Planilla.
 *   VINCULACION → Módulo Vinculación y Legajo Personal.
 *   RRHH_ADMIN → Catálogos y Reportes.
 *   EMPLEADO → Mi perfil, Mi legajo y Gestiones del personal.
 *
 * Los guards de ruta siguen siendo la fuente de verdad del acceso; este archivo
 * solo decide qué se dibuja en el sidebar.
 */
export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  { label: 'Inicio', route: '/', icon: 'home' },
  {
    label: 'Mi perfil',
    route: '/portal-empleado/mi-perfil',
    icon: 'account_circle',
    requiredAnyRole: [...AUTOSERVICIO_ROLES],
  },
  {
    label: 'Mi legajo',
    route: '/legajo/mi-legajo',
    icon: 'folder_shared',
    requiredAnyRole: [...AUTOSERVICIO_ROLES],
  },
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
    // Único rol funcional: VINCULACION (+ SUPER_ADMIN). Ni el portal de
    // autoservicio ni los roles de planilla entran aquí.
    requiredAnyRole: [...VINCULACION_ACCESS_ROLES],
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
    // Papeletas / autoservicio: roles del portal. Los hijos se recortan por PAP_*.
    requiredAnyRole: [...GESTIONES_PERSONAL_ROLES],
    children: [
      { label: 'Gestión del empleado', route: '/gestiones-personal/empleado', icon: 'badge' },
      {
        label: 'Gestión del jefe inmediato',
        route: '/gestiones-personal/jefe-inmediato',
        icon: 'supervisor_account',
        requiredPermissions: ['PAP_JEFE'],
      },
      {
        label: 'Gestión de RRHH',
        route: '/gestiones-personal/rrhh',
        icon: 'diversity_3',
        requiredPermissions: ['PAP_RRHH'],
      },
      {
        label: 'Mis Asistencias',
        route: '/asistencia-empleado/mis-asistencias',
        icon: 'event_available',
      },
      {
        label: 'Teletrabajo',
        route: '/teletrabajo',
        icon: 'home_work',
        requiredPermissions: ['PAP_RRHH'],
      },
    ],
  },

  {
    label: 'Legajo Personal',
    route: '',
    icon: 'folder_shared',
    // Legajo de TODOS los empleados → módulo Vinculación.
    // EMPLEADO ya tiene su propio acceso vía "Mi legajo" (arriba en este menú).
    requiredAnyRole: [...VINCULACION_ACCESS_ROLES],
    children: [
      {
        label: 'Legajo',
        route: '/legajo',
        icon: 'folder_shared',
      },
    ],
  },

  {
    label: 'Planilla',
    route: '',
    icon: 'calculate',
    // Padre abierto también a ASISTENCIA, que solo ve 2 de los 10 hijos.
    requiredAnyRole: [...PLANILLA_MENU_ROLES],
    children: [
      {
        label: 'Configuración Anual',
        route: '/planilla/configuracion-cas',
        icon: 'settings',
        sectionHeader: 'Configuración',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },
      {
        label: 'Conceptos de Planilla',
        route: '/planilla/conceptos',
        icon: 'receipt_long',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },
      {
        // Visible para ASISTENCIA: consulta el período abierto (PER_READ).
        label: 'Periodos',
        route: '/planilla/periodos',
        icon: 'event',
        sectionHeader: 'OPERACIÓN MENSUAL',
        requiredAnyRole: [...PLANILLA_MENU_ROLES],
      },
      {
        // Operado por ASISTENCIA y PLANILLA (permisos ASI_*).
        label: 'Gestión de Asistencia',
        route: '/asistencia/carga',
        icon: 'event_available',
        requiredAnyRole: [...ASISTENCIA_ACCESS_ROLES],
      },
      {
        label: 'Subsidios (Enfermedad/Maternidad)',
        route: '/asistencia/subsidios',
        icon: 'medical_services',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },
      {
        label: 'Suspensiones / Licencias',
        route: '/planilla/suspensiones',
        icon: 'event_busy',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },

      {
        label: 'Centro de Validaciones',
        route: '/planilla/validaciones',
        icon: 'rule',
        sectionHeader: 'PROCESAR PLANILLA',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },
      {
        label: 'Generación Planilla',
        route: '/planilla/generacion-masiva',
        icon: 'group_work',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },

      {
        label: 'Movimientos',
        route: '/planilla/movimientos',
        icon: 'list',
        sectionHeader: 'Resultados',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },

      {
        label: 'MCPP',
        route: '/planilla/mcpp',
        icon: 'receipt',
        requiredAnyRole: [...PLANILLA_FULL_ROLES],
      },
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

function pruneNavChildren(
  children: readonly MainNavChildItem[],
  pSet: ReadonlySet<string>,
  rSet: ReadonlySet<string>,
): readonly MainNavChildItem[] {
  const pruned: MainNavChildItem[] = [];
  for (const child of children) {
    // Control de acceso por sub-ítem (segregación dentro del módulo).
    const reqs = child.requiredPermissions;
    if (reqs?.length && !reqs.every((p) => pSet.has(p))) continue;
    const anyRoles = child.requiredAnyRole;
    if (anyRoles?.length && !anyRoles.some((r) => rSet.has(r))) continue;

    if (child.children?.length) {
      const nested = pruneNavChildren(child.children, pSet, rSet);
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
      const children = pruneNavChildren(item.children, pSet, rSet);
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
