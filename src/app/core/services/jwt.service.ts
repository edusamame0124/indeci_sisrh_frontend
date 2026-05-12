import { Injectable } from '@angular/core';

/**
 * Decodifica el payload de un JWT en el cliente SOLO para UI.
 * NO verifica firma — esa responsabilidad es del backend en cada request.
 *
 * Uso típico: derivar username/roles/permisos del access token para signals
 * computed sin llamar al backend.
 */
@Injectable({ providedIn: 'root' })
export class JwtService {
  /**
   * Decodifica el payload (segunda parte del JWT) y lo parsea como T.
   * Retorna null si el token está malformado, vacío o el JSON es inválido.
   */
  decode<T>(token: string | null | undefined): T | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const payload = parts[1];
      // Base64URL → Base64 estándar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as T;
    } catch {
      return null;
    }
  }

  /** Retorna true si el JWT está expirado (claim `exp` en el pasado). */
  isExpired(token: string | null | undefined): boolean {
    const claims = this.decode<{ exp?: number }>(token);
    if (claims === null || typeof claims.exp !== 'number') return true;
    return claims.exp * 1000 < Date.now();
  }
}
