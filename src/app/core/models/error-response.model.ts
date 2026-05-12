/**
 * Formato uniforme de error del GlobalExceptionHandler del backend.
 * Incluye 429 para rate-limit de login (Spec 008).
 */
export interface ErrorResponse {
  readonly status: 400 | 403 | 429 | 500;
  readonly mensaje: string;
  readonly requiereCaptcha: boolean;
}

/** Type guard para detectar si un error es del backend (vs network/parse) */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['status'] === 'number' &&
    typeof v['mensaje'] === 'string' &&
    typeof v['requiereCaptcha'] === 'boolean'
  );
}
