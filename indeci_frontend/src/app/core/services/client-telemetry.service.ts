import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Categorías de eventos críticos del lado cliente (FR-039).
 * NUNCA loggear datos sensibles (contraseñas, OTP, tokens completos, secretos) (FR-041).
 */
export type TelemetryCategory =
  | 'STORAGE_UNAVAILABLE'
  | 'TURNSTILE_LOAD_FAILED'
  | 'REFRESH_TRIGGERED'
  | 'REFRESH_FAILED'
  | 'OTP_LIMIT_EXCEEDED'
  | 'BACKEND_UNREACHABLE'
  | 'MULTI_TAB_LOGOUT'
  | 'HEADER_LOGOUT'
  /** Acciones UI módulo catálogos ADMIN (Spec 006); detalle en payload.extra.action */
  | 'CATALOG_ADMIN_UI'
  /** Módulo administración usuarios/roles/permisos/auditoría (Spec 007) */
  | 'ADMIN_MODULE_UI';

/** Payload sanitizado — sin tokens, claves, ni códigos OTP. */
export interface TelemetryPayload {
  readonly url?: string;
  readonly status?: number;
  readonly mensaje?: string;
  readonly username?: string; // username SÍ está OK (no es secreto)
  readonly extra?: Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class ClientTelemetryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Registra un evento crítico. En desarrollo: console.error. En producción:
   * envío opcional vía fetch keepalive a un endpoint backend (FR-040). Si el
   * envío falla o el endpoint no existe, swallow silente (no afecta UX).
   */
  track(category: TelemetryCategory, payload: TelemetryPayload = {}): void {
    const sanitized = this.sanitize(payload);

    if (!environment.production) {
      console.error(`[TELEMETRY] ${category}`, sanitized);
      return;
    }

    if (!environment.telemetry.enabled || !this.isBrowser) return;

    try {
      fetch(environment.telemetry.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, ts: new Date().toISOString(), ...sanitized }),
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {
        /* swallow — telemetría no debe romper UX (FR-040) */
      });
    } catch {
      /* swallow */
    }
  }

  /** Defensa final FR-041: filtra cualquier campo sospechoso de contener datos sensibles. */
  private sanitize(p: TelemetryPayload): TelemetryPayload {
    const blockedKeys = ['password', 'pass', 'token', 'codigo', 'otp', 'secret', 'turnstile'];
    const cleanExtra: Record<string, string | number | boolean> = {};
    if (p.extra) {
      for (const [k, v] of Object.entries(p.extra)) {
        const isBlocked = blockedKeys.some((blocked) => k.toLowerCase().includes(blocked));
        if (!isBlocked) cleanExtra[k] = v;
      }
    }
    return {
      url: p.url,
      status: p.status,
      mensaje: p.mensaje,
      username: p.username,
      extra: Object.keys(cleanExtra).length > 0 ? cleanExtra : undefined,
    };
  }
}
