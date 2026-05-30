/**
 * Claims tipados de los JWTs emitidos por el backend SISRH (verificado contra JwtProvider.java).
 *
 * Decodificación SOLO para UI (signals derivados). La validación REAL de firma + autorización
 * la hace el backend en cada request al validar el header Authorization.
 */

/** Claims comunes a TODOS los tokens */
export interface JwtBaseClaims {
  /** username del usuario */
  readonly sub: string;
  /** epoch seconds, issued at */
  readonly iat: number;
  /** epoch seconds, expiration */
  readonly exp: number;
}

/** Token temporal (10 min) tras credenciales válidas, ANTES de OTP */
export interface TemporalTokenClaims extends JwtBaseClaims {
  readonly otpValidado: false;
  readonly newPassOk: boolean;
}

/** Token cambio-clave (15 min) cuando NEW_CLAVE='S' */
export interface ChangePasswordTokenClaims extends JwtBaseClaims {
  readonly otpValidado: true;
  readonly newPassOk: false;
  readonly roles: readonly never[];
  readonly permisos: readonly never[];
}

/** Token definitivo (2h) tras OTP exitoso */
export interface AccessTokenClaims extends JwtBaseClaims {
  readonly otpValidado: true;
  readonly newPassOk: true;
  readonly roles: ReadonlyArray<string>;
  readonly permisos: ReadonlyArray<string>;
  /** Spec 011 / B2 — empleado vinculado a la cuenta (null si no tiene). */
  readonly empleadoId?: number | null;
  /**
   * Fase 3 SSO — mapa código de sistema → roles del usuario en ese sistema.
   * Siempre contiene "sisrh" cuando el SSO está activo; puede contener
   * "convocatoria", "rendimiento", etc. Ausente para tokens Fase 1/2 legacy
   * (emitidos antes de V010_34/35) — el frontend trata `undefined` como
   * "solo SISRH" y salta el selector.
   */
  readonly sistemas?: Readonly<Record<string, ReadonlyArray<string>>>;
}

/** Refresh token (24h) emitido junto con access definitivo */
export interface RefreshTokenClaims extends JwtBaseClaims {
  readonly type: 'refresh';
}

/** Unión discriminada para clasificación tras decodificar */
export type DecodedJwtClaims =
  | TemporalTokenClaims
  | ChangePasswordTokenClaims
  | AccessTokenClaims
  | RefreshTokenClaims;

/** Type guards */
export function isAccessTokenClaims(c: DecodedJwtClaims | null): c is AccessTokenClaims {
  return c !== null && 'otpValidado' in c && c.otpValidado === true && 'newPassOk' in c && c.newPassOk === true;
}

export function isTemporalTokenClaims(c: DecodedJwtClaims | null): c is TemporalTokenClaims {
  return c !== null && 'otpValidado' in c && c.otpValidado === false;
}

export function isChangePasswordTokenClaims(c: DecodedJwtClaims | null): c is ChangePasswordTokenClaims {
  return c !== null && 'newPassOk' in c && c.newPassOk === false && 'otpValidado' in c && c.otpValidado === true;
}
