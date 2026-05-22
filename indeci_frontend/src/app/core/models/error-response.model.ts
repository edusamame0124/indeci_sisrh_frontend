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
  if (typeof v['mensaje'] !== 'string' || !v['mensaje'].trim()) return false;
  if (v['status'] !== undefined && typeof v['status'] !== 'number') return false;
  if (v['requiereCaptcha'] !== undefined && typeof v['requiereCaptcha'] !== 'boolean') {
    return false;
  }
  return true;
}

/**
 * Extrae `mensaje` del cuerpo de error HTTP aunque falte `requiereCaptcha`
 * (errores RRHH / catálogos suelen omitirlo; login sí lo envía).
 */
export function readApiErrorMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const v = body as Record<string, unknown>;
  const mensaje = v['mensaje'];
  if (typeof mensaje === 'string' && mensaje.trim()) return mensaje.trim();
  return null;
}
