/**
 * Development environment. Reemplaza environment.ts en `ng serve`/`ng build --configuration development`.
 */
export const environment = {
  production: false,
  apiUrl: '/api', // proxy.conf.json redirige a http://localhost:8080
  appName: 'SISRH-INDECI',
  tokenKey: 'sisrh_access_token',
  refreshKey: 'sisrh_refresh_token',
  /**
   * Turnstile site key para desarrollo. Cloudflare provee 1x00000000000000000000AA
   * como SITE KEY de prueba (siempre pasa) y 2x00000000000000000000AB (siempre falla).
   * Reemplazar por la clave real del dominio de desarrollo cuando esté disponible.
   */
  turnstileSiteKey: '1x00000000000000000000AA', // sitekey de prueba "always pass" (Cloudflare)
  telemetry: {
    enabled: false,
    endpoint: '/api/telemetry/client',
  },
};
