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
 *   - todo OK → token = AccessToken (2h) y refreshToken = RefreshToken (24h)
 */
export interface LoginResponse {
  readonly token: string;
  readonly refreshToken?: string | null;
  readonly roles?: ReadonlyArray<string> | null;
  readonly permisos?: ReadonlyArray<string> | null;
  readonly newPass?: 'S' | 'N' | null;
  readonly requiereOtp?: boolean;
  readonly requiereEnroll?: boolean;
}
