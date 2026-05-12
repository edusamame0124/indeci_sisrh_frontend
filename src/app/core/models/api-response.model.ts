/**
 * Wrapper canónico de respuesta de éxito del backend SISRH.
 *
 * NOTA: Los endpoints `/api/auth/*` NO usan este wrapper (devuelven LoginResponse
 * u OtpEnrollResponse directamente). El resto del backend (rrhh, catalogos) SÍ.
 */
export interface ApiResponse<T> {
  readonly estado: 'OK';
  readonly mensaje: string;
  readonly data: T;
}
