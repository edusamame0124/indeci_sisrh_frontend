/**
 * Espejo de com.indeci.auth.dto.LoginRequest y LoginResponse del backend.
 *
 * IMPORTANTE: el campo `token` es polimórfico según las flags acompañantes.
 * Ver `LoginFlowService.classifyAndRoute()` para la lógica de despacho.
 */

export interface LoginRequest {
  username: string;
  password: string;
  /** Token de Cloudflare Turnstile; obligatorio cuando backend respondió previamente requiereCaptcha=true */
  turnstileToken?: string;
}

/**
 * Respuesta del POST /api/auth/login. El campo token es polimórfico:
 *   - requiereOtp=true | requiereEnroll=true → token = TemporalToken (10 min)
 *   - newPass='S' → token = ChangePasswordToken (15 min)
 *   - todo OK → token = AccessToken (2h)
 *
 * Spec 013 / C4 — el refresh token NO viaja en este cuerpo: el backend lo emite
 * en una cookie HttpOnly. El JavaScript del cliente nunca lo ve.
 */
export interface LoginResponse {
  readonly token: string;
  readonly roles?: ReadonlyArray<string> | null;
  readonly permisos?: ReadonlyArray<string> | null;
  readonly newPass?: 'S' | 'N' | null;
  readonly requiereOtp?: boolean;
  readonly requiereEnroll?: boolean;
}
