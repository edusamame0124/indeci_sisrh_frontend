import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { JwtService } from './jwt.service';
import { TokenStorageService } from './token-storage.service';
import { ClientTelemetryService } from './client-telemetry.service';
import {
  AccessTokenClaims,
  DecodedJwtClaims,
  isAccessTokenClaims,
} from '../models/jwt-claims.model';
import { LoginResponse } from '../../features/auth/models/login.model';
import { environment } from '../../../environments/environment';

/**
 * Estado global de sesión expuesto vía signals.
 * Único punto de verdad sobre "está el usuario autenticado y con qué rol/permiso".
 *
 * Spec 013 / C4 — el refresh token vive en una cookie HttpOnly gestionada por
 * el backend; el cliente nunca lo ve ni lo almacena. Solo el access token se
 * mantiene en localStorage (vía {@link TokenStorageService}).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly jwt = inject(JwtService);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly platformId = inject(PLATFORM_ID);

  // ============== Estado primitivo ==============
  private readonly _accessToken = signal<string | null>(null);

  // ============== Estado expuesto ==============
  readonly accessToken = this._accessToken.asReadonly();

  // ============== Estado derivado ==============
  readonly claims = computed<DecodedJwtClaims | null>(() => {
    const t = this._accessToken();
    return t ? this.jwt.decode<DecodedJwtClaims>(t) : null;
  });

  readonly username = computed<string | null>(() => this.claims()?.sub ?? null);

  readonly roles = computed<ReadonlyArray<string>>(() => {
    const c = this.claims();
    return c && 'roles' in c ? (c.roles as ReadonlyArray<string>) : [];
  });

  readonly permisos = computed<ReadonlyArray<string>>(() => {
    const c = this.claims();
    return c && 'permisos' in c ? (c.permisos as ReadonlyArray<string>) : [];
  });

  /** Spec 011 / B2 — empleado vinculado a la cuenta (null si no tiene). */
  readonly empleadoId = computed<number | null>(() => {
    const c = this.claims();
    return c && 'empleadoId' in c ? ((c.empleadoId as number | null) ?? null) : null;
  });

  readonly isExpired = computed<boolean>(() => {
    const t = this._accessToken();
    return t === null || this.jwt.isExpired(t);
  });

  /** TRUE únicamente cuando hay access token vigente que ya pasó OTP y no requiere cambio de clave. */
  readonly isAuthenticated = computed<boolean>(() => {
    const c = this.claims();
    return c !== null && !this.isExpired() && isAccessTokenClaims(c);
  });

  readonly requiresOtpValidation = computed<boolean>(() => {
    const c = this.claims();
    return c !== null && 'otpValidado' in c && c.otpValidado === false;
  });

  readonly requiresPasswordChange = computed<boolean>(() => {
    const c = this.claims();
    return c !== null && 'newPassOk' in c && c.newPassOk === false;
  });

  constructor() {
    this.registerMultiTabStorageListener();
  }

  /** Otra pestaña eliminó el access token: cerrar sesión local y navegar al login (F7 Phase 7). */
  private registerMultiTabStorageListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const accessKey = environment.tokenKey;

    window.addEventListener('storage', (ev: StorageEvent) => {
      if (ev.storageArea !== localStorage) return;
      if (ev.key !== accessKey) return;
      if (ev.newValue !== null && ev.newValue !== '') return;
      queueMicrotask(() => this.onPossibleRemoteStorageClear(accessKey));
    });
  }

  private onPossibleRemoteStorageClear(accessKey: string): void {
    let hasAny = false;
    try {
      hasAny = localStorage.getItem(accessKey) !== null;
    } catch {
      return;
    }
    if (hasAny) return;
    if (this._accessToken() === null) return;

    this.clearSession();
    this.telemetry.track('MULTI_TAB_LOGOUT', {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    void this.router.navigateByUrl('/auth/login');
  }

  // ============== Métodos públicos ==============

  /** Llamar al boot de la app para reconstruir signals desde localStorage. */
  hydrateFromStorage(): void {
    this._accessToken.set(this.storage.getAccess());
  }

  /** Sesión completa (tras OTP exitoso o refresh exitoso). El refresh token
   * lo gestiona el backend en su cookie HttpOnly — aquí solo el access token. */
  setSession(login: LoginResponse): void {
    this._accessToken.set(login.token);
    this.storage.setAccess(login.token);
  }

  /** Solo access token (token temporal o cambio-clave). */
  setTemporalToken(token: string): void {
    this._accessToken.set(token);
    this.storage.setAccess(token);
  }

  /** Limpia la sesión local. La cookie de refresh la revoca el backend en `/logout`. */
  clearSession(): void {
    this._accessToken.set(null);
    this.storage.clearAll();
  }

  /** Helper: type guard fuerte para acceder a claims completos solo si está autenticado. */
  getAccessClaims(): AccessTokenClaims | null {
    const c = this.claims();
    return c !== null && isAccessTokenClaims(c) ? c : null;
  }
}
