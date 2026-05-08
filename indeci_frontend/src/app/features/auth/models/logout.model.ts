/** Cuerpo de POST /api/auth/logout (Spec 008). */
export interface LogoutRequest {
  readonly refreshToken: string;
}
