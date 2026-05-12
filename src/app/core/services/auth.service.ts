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
 * CONSTITUTION-EXCEPTION: refreshToken en localStorage hasta migración a HttpOnly cookie.
 *   Justificación: Decisión MVP B aprobada en /speckit-clarify (sesión 2026-05-05).
 *   Migración planificada en spec posterior cuando backend exponga SetCookie.
 *   Revisión: Q3-2026.
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
  private readonly _refreshToken = signal<string | null>(null);

  // ============== Estado expuesto ==============
  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();

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

  /** Otra pestaña eliminó tokens: cerrar sesión local y navegar al login (F7 Phase 7). */
  private registerMultiTabStorageListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const accessKey = environment.tokenKey;
    const refreshKey = environment.refreshKey;

    window.addEventListener('storage', (ev: StorageEvent) => {
      if (ev.storageArea !== localStorage) return;
      if (ev.key !== accessKey && ev.key !== refreshKey) return;
      if (ev.newValue !== null && ev.newValue !== '') return;
      queueMicrotask(() => this.onPossibleRemoteStorageClear(accessKey, refreshKey));
    });
  }

  private onPossibleRemoteStorageClear(accessKey: string, refreshKey: string): void {
    let hasAny = false;
    try {
      hasAny =
        localStorage.getItem(accessKey) !== null || localStorage.getItem(refreshKey) !== null;
    } catch {
      return;
    }
    if (hasAny) return;
    if (this._accessToken() === null && this._refreshToken() === null) return;

    this.clearSession();
    this.telemetry.track('MULTI_TAB_LOGOUT', {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    void this.router.navigateByUrl('/auth/login');
  }

  // ============== Métodos públicos ==============

  /** Llamar al boot de la app para reconstruir signals desde localStorage. */
  hydrateFromStorage(): void {
    const access = this.storage.getAccess();
    const refresh = this.storage.getRefresh();
    this._accessToken.set(access);
    this._refreshToken.set(refresh);
  }

  /** Sesión completa (tras OTP exitoso o refresh exitoso). */
  setSession(login: LoginResponse): void {
    this._accessToken.set(login.token);
    this.storage.setAccess(login.token);
    if (login.refreshToken) {
      this._refreshToken.set(login.refreshToken);
      this.storage.setRefresh(login.refreshToken);
    }
  }

  /** Solo access token (token temporal o cambio-clave; sin refresh). */
  setTemporalToken(token: string): void {
    this._accessToken.set(token);
    this.storage.setAccess(token);
  }

  /** Solo refresh token (caso raro: rotación sin cambiar access). */
  setRefreshToken(token: string): void {
    this._refreshToken.set(token);
    this.storage.setRefresh(token);
  }

  /** Limpia toda la sesión local. NO llama backend (logout backend en spec posterior). */
  clearSession(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this.storage.clearAll();
  }

  /** Helper: type guard fuerte para acceder a claims completos solo si está autenticado. */
  getAccessClaims(): AccessTokenClaims | null {
    const c = this.claims();
    return c !== null && isAccessTokenClaims(c) ? c : null;
  }
}
