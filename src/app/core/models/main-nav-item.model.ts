/**
 * Hijo de un ítem de menú agrupado (ej. Catálogos — Spec 006).
 */
export interface MainNavChildItem {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
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
