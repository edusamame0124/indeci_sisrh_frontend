/**
 * Hijo de un ítem de menú agrupado (ej. Catálogos — Spec 006).
 * Si define `children`, actúa como subgrupo (sin enlace); si no, `route` es obligatorio.
 */
export interface MainNavChildItem {
  readonly label: string;
  readonly icon: string;
  /** Ruta del enlace. Omitir o vacío cuando el ítem solo agrupa `children`. */
  readonly route?: string;
  /**
   * Si true: ruta aún no implementada. Se renderiza en gris con tooltip
   * "Próximamente" y sin link activo.
   */
  readonly comingSoon?: boolean;
  /** Subgrupo anidado (Fase 5 — catálogos escaneables). */
  readonly children?: readonly MainNavChildItem[];
}

/**
 * Entrada estática del menú lateral principal (shell post-login — Spec 002+).
 */
export interface MainNavItem {
  readonly label: string;
  /**
   * Ruta del ítem simple. Vacío cuando solo agrupa `children` (cabecera expandible).
   */
  readonly route: string;
  readonly icon: string;
  /** Subítems opcionales (panel expandible). */
  readonly children?: readonly MainNavChildItem[];
  /** Si definido y no vacío: el usuario debe tener todas estas permisiones JWT (`permisos`). */
  readonly requiredPermissions?: readonly string[];
  /** Si definido y no vacío: el usuario debe tener al menos uno de estos roles JWT (`roles`). */
  readonly requiredAnyRole?: readonly string[];
}

/** Ítem hoja con ruta navegable. */
export function isNavLeaf(item: MainNavChildItem): item is MainNavChildItem & { route: string } {
  return Boolean(item.route) && !item.children?.length;
}

/** Aplana subgrupos a ítems hoja (rutas de catálogo, tests, dashboard). */
export function flattenNavLeaves(
  items: readonly MainNavChildItem[] | undefined,
): readonly MainNavChildItem[] {
  if (!items?.length) return [];
  const out: MainNavChildItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...flattenNavLeaves(item.children));
    } else if (item.route) {
      out.push(item);
    }
  }
  return out;
}
