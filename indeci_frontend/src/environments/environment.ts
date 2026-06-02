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
   apiUrl: '/api',
  appName: 'SISRH-INDECI',
  tokenKey: 'sisrh_access_token',
  /**
   * Cloudflare Turnstile site key. Reemplazar por la clave real del portal Cloudflare
   * antes de desplegar a producción. Esta clave es PÚBLICA (segura para frontend).
   */
  turnstileSiteKey: '0x0000000000000000000000', // PLACEHOLDER — reemplazar en deploy
  telemetry: {
    enabled: false, // toggle ON cuando exista endpoint backend (FR-040)
    endpoint: '/api/telemetry/client',
  },
  /**
   * Fase 3 SSO — URLs de los sistemas hermanos para el Portal Selector.
   * El selector lee el claim `sistemas` del JWT y, si el usuario elige uno
   * externo, redirige a `<urlBase>?token=<accessToken>`. AJUSTAR en deploy
   * productivo según el dominio real de cada sistema.
   */
  sistemasExternos: {
    convocatoria: 'http://10.64.24.19:8089',
  rendimiento: 'http://10.64.24.19:8088',
  } as Readonly<Record<string, string>>,
};
