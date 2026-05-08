/**
 * Production environment.
 *
 * En desarrollo, el archivo `environment.development.ts` reemplaza este
 * mediante `fileReplacements` declarado en angular.json (configuration: development).
 *
 * SC-011: bundle inicial < 300KB gzip — mantener este archivo minimal.
 */
export const environment = {
  production: true,
  apiUrl: 'https://app.indeci.gob.pe/api',
  appName: 'SISRH-INDECI',
  tokenKey: 'sisrh_access_token',
  refreshKey: 'sisrh_refresh_token',
  /**
   * Cloudflare Turnstile site key. Reemplazar por la clave real del portal Cloudflare
   * antes de desplegar a producción. Esta clave es PÚBLICA (segura para frontend).
   */
  turnstileSiteKey: '0x0000000000000000000000', // PLACEHOLDER — reemplazar en deploy
  telemetry: {
    enabled: false, // toggle ON cuando exista endpoint backend (FR-040)
    endpoint: '/api/telemetry/client',
  },
};
