import type { MainNavItem } from '../../../../core/models/main-nav-item.model';
import { flattenNavLeaves } from '../../../../core/models/main-nav-item.model';

export interface DashboardModuleMeta {
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
  readonly cta: string;
  readonly wide?: boolean;
  readonly primary?: boolean;
}

export interface DashboardCardView {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly accessible: boolean;
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
  readonly cta: string;
  readonly wide: boolean;
  readonly primary: boolean;
}

/** Textos operativos por módulo del menú lateral (P1-6). */
export const DASHBOARD_MODULE_META: Record<string, DashboardModuleMeta> = {
  Catálogos: {
    kicker: 'Módulo Catálogos',
    title: 'Catálogos maestros',
    description:
      'Tablas de referencia: ubigeo, régimen laboral, conceptos de planilla y demás parámetros institucionales.',
    cta: 'Ir a Catálogos',
  },
  Empleados: {
    kicker: 'Módulo Empleados',
    title: 'Gestión de personal',
    description:
      'Personas, puesto laboral, cuentas de abono, pensión, planilla por empleado y conceptos asignados.',
    cta: 'Ir a Empleados',
    primary: true,
  },
  Planilla: {
    kicker: 'Planilla electrónica',
    title: 'Periodos y procesos',
    description:
      'Apertura de periodos, generación de planillas, movimientos, asistencia y cierres presupuestales.',
    cta: 'Ir a Planilla',
    wide: true,
  },
  'Portal del empleado': {
    kicker: 'Autoservicio',
    title: 'Portal del empleado',
    description:
      'Consulta de boletas, datos personales y trámites del trabajador en un entorno de solo lectura.',
    cta: 'Abrir portal',
  },
  Reportes: {
    kicker: 'Módulo Reportes',
    title: 'Informes y exportación',
    description:
      'Resúmenes mensuales, conciliación AIRHSP, archivos bancarios, Excel e historial por empleado.',
    cta: 'Ir a Reportes',
    wide: true,
  },
  Administración: {
    kicker: 'Módulo Administración',
    title: 'Usuarios y seguridad',
    description:
      'Gestión de usuarios, roles, permisos y registro de auditoría del sistema.',
    cta: 'Ir a Administración',
  },
};

export function resolveNavRoute(item: MainNavItem): string {
  const direct = item.route?.trim();
  if (direct) {
    return direct;
  }
  const firstLeaf = flattenNavLeaves(item.children).find((c) => !c.comingSoon && c.route);
  return firstLeaf?.route ?? '/';
}

export function buildDashboardCards(
  allItems: readonly MainNavItem[],
  visibleLabels: ReadonlySet<string>,
): DashboardCardView[] {
  return allItems
    .filter((item) => item.label !== 'Inicio')
    .map((item) => {
      const meta = DASHBOARD_MODULE_META[item.label] ?? {
        kicker: item.label,
        title: item.label,
        description: `Acceda al módulo ${item.label} desde el menú lateral.`,
        cta: `Ir a ${item.label}`,
      };
      return {
        label: item.label,
        icon: item.icon,
        route: resolveNavRoute(item),
        accessible: visibleLabels.has(item.label),
        kicker: meta.kicker,
        title: meta.title,
        description: meta.description,
        cta: meta.cta,
        wide: meta.wide ?? false,
        primary: meta.primary ?? false,
      };
    });
}
