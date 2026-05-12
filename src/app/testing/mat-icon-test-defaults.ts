import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';

/**
 * Iguala la clase por defecto de `mat-icon` con `app.config.ts` (Material Symbols Outlined).
 * Invocar al final de `beforeEach` tras `TestBed.configureTestingModule(...)`.
 *
 * ---
 * **Smoke manual (QA en navegador real, redes institucionales):**
 * - Pantallas con tabla (catálogos, RRHH, admin): columna **Acciones** muestra símbolos Material Symbols visibles (fuentes auto-alojadas / sin CDN bloqueado).
 * - **Paginador:** siguiente página, última página, cambio de `page size`; con **filtro** activo, el total del paginador refleja el subconjunto filtrado.
 * - **Viewport estrecho (~375px):** el contenedor `.sisrh-table-scroll` permite **scroll horizontal** sin ocultar columnas de forma ambigua.
 */
export function setMatIconDefaultFontSetForTests(): void {
  TestBed.inject(MatIconRegistry).setDefaultFontSetClass(
    'material-symbols-outlined',
    'mat-ligature-font',
  );
}
