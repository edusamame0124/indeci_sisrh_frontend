/** Espejo de com.indeci.auth.dto.ChangePasswordRequest del backend. */

export interface ChangePasswordRequest {
  /**
   * Nueva clave que cumple política: mín 8 caracteres, ≥1 mayúscula, ≥1 minúscula,
   * ≥1 dígito, ≥1 carácter especial. Validada en cliente antes del POST.
   */
  nuevaClave: string;
}
