/** Espejo de com.indeci.auth.dto.OtpRequest y OtpEnrollResponseDto del backend. */

export interface OtpRequest {
  /** Exactamente 6 dígitos numéricos. Validado en cliente y backend. */
  codigo: string;
}

export interface OtpEnrollResponse {
  /**
   * URL absoluta o data URL del QR.
   *
   * Estado actual del backend (2026-05-07): devuelve URL HTTP externa
   * (`https://api.qrserver.com/v1/create-qr-code/...`) que renderiza el browser.
   * Migración planificada en Spec 008 (backend hardening) a generación local
   * con ZXing y dataURL base64, por privacidad gubernamental — el secret OTP
   * actualmente sale a un servicio público de terceros.
   */
  readonly qrImage: string;
}
