import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Estrategia de renderizado por ruta:
 *
 * - `/auth/**` → CSR puro: Cloudflare Turnstile, QR canvas y localStorage requieren
 *   navegador (window/document). SSR causaría hydration mismatch (research.md R1, R13).
 *
 * - `/empleados/**`, `/catalogos/**`, `/planilla/**`, `/reportes/**` y `/admin/**` →
 *   CSR puro: rutas privadas tras login con parámetros dinámicos (`:id`, `:empleadoId/:periodo`, etc.).
 *
 * - Resto (`/`, etc.) → SSR con hydration. Mejor TTFB para la pantalla de inicio del
 *   dashboard (que sí puede prerenderizarse parcialmente).
 *
 * Cuando se agreguen futuras secciones privadas con `:id` (ej. `/empleado/:id/banco`),
 * declararlas también como `RenderMode.Client`.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'auth/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'transparencia/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'empleados/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'catalogos/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'asistencia/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'planilla/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'portal-empleado/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reportes/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
