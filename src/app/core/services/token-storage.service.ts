import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Persistencia de tokens en localStorage del navegador.
 * Detecta disponibilidad al boot — si localStorage no está disponible (modo
 * incógnito, kioscos restringidos), las operaciones son no-op y el bootstrap
 * de la app debe redirigir a la pantalla de error de almacenamiento (FR-030).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly tokenKey = environment.tokenKey;
  private readonly refreshKey = environment.refreshKey;

  /**
   * Detecta si localStorage es realmente accesible. Algunas configuraciones
   * (Safari incógnito, kioscos) hacen que `localStorage` exista pero throwee
   * al setItem.
   */
  isAvailable(): boolean {
    if (!this.isBrowser) return false;
    try {
      const probe = '__sisrh_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  getAccess(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  setAccess(token: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.tokenKey, token);
    } catch {
      // swallow — caller should have validated isAvailable() previo
    }
  }

  getRefresh(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(this.refreshKey);
    } catch {
      return null;
    }
  }

  setRefresh(token: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.refreshKey, token);
    } catch {
      /* noop */
    }
  }

  clearAll(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshKey);
    } catch {
      /* noop */
    }
  }
}
