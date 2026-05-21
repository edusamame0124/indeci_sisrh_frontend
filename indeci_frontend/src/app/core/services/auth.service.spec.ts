import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { ClientTelemetryService } from './client-telemetry.service';
import { environment } from '../../../environments/environment';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('AuthService (signals)', () => {
  let service: AuthService;
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 100;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    if (typeof localStorage !== 'undefined') localStorage.clear();
    service.clearSession();
  });

  it('initial state has no session', () => {
    expect(service.accessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.username()).toBeNull();
    expect(service.roles()).toEqual([]);
  });

  it('setSession populates signals from access token claims', () => {
    const token = makeJwt({
      sub: 'jdoe',
      otpValidado: true,
      newPassOk: true,
      roles: ['ADMIN'],
      permisos: ['READ', 'WRITE'],
      exp: futureExp,
      iat: Math.floor(Date.now() / 1000),
    });
    service.setSession({
      token,
      roles: [],
      permisos: [],
      requiereOtp: false,
      requiereEnroll: false,
    });

    expect(service.username()).toBe('jdoe');
    expect(service.roles()).toEqual(['ADMIN']);
    expect(service.permisos()).toEqual(['READ', 'WRITE']);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated is false when token expired', () => {
    const token = makeJwt({
      sub: 'jdoe',
      otpValidado: true,
      newPassOk: true,
      roles: [],
      permisos: [],
      exp: pastExp,
    });
    service.setSession({
      token,
      roles: [],
      permisos: [],
      requiereOtp: false,
      requiereEnroll: false,
    });
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isExpired()).toBe(true);
  });

  it('requiresOtpValidation derives from claim otpValidado=false', () => {
    const token = makeJwt({ sub: 'x', otpValidado: false, newPassOk: true, exp: futureExp });
    service.setTemporalToken(token);
    expect(service.requiresOtpValidation()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('requiresPasswordChange derives from claim newPassOk=false', () => {
    const token = makeJwt({
      sub: 'x',
      otpValidado: true,
      newPassOk: false,
      roles: [],
      permisos: [],
      exp: futureExp,
    });
    service.setTemporalToken(token);
    expect(service.requiresPasswordChange()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('clearSession resets all signals', () => {
    const token = makeJwt({ sub: 'x', otpValidado: true, newPassOk: true, exp: futureExp });
    service.setSession({
      token,
      roles: [],
      permisos: [],
      requiereOtp: false,
      requiereEnroll: false,
    });
    service.clearSession();
    expect(service.accessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('handles multi-tab logout when token keys disappear (storage event)', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const telemetry = TestBed.inject(ClientTelemetryService);
    vi.spyOn(telemetry, 'track').mockImplementation(() => undefined);

    const token = makeJwt({
      sub: 'tabs',
      otpValidado: true,
      newPassOk: true,
      roles: [],
      permisos: [],
      exp: futureExp,
    });
    service.setSession({
      token,
      roles: [],
      permisos: [],
      requiereOtp: false,
      requiereEnroll: false,
    });

    localStorage.removeItem(environment.tokenKey);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: environment.tokenKey,
        oldValue: token,
        newValue: null,
        storageArea: localStorage,
      }),
    );

    await flushMicrotasks();

    expect(service.accessToken()).toBeNull();
    expect(telemetry.track).toHaveBeenCalledWith(
      'MULTI_TAB_LOGOUT',
      expect.objectContaining({ url: expect.any(String) }),
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('ignores storage event when tokens still exist locally', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const telemetry = TestBed.inject(ClientTelemetryService);
    vi.spyOn(telemetry, 'track').mockImplementation(() => undefined);

    const token = makeJwt({
      sub: 'keep',
      otpValidado: true,
      newPassOk: true,
      roles: [],
      permisos: [],
      exp: futureExp,
    });
    service.setSession({
      token,
      roles: [],
      permisos: [],
      requiereOtp: false,
      requiereEnroll: false,
    });

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: environment.tokenKey,
        oldValue: null,
        newValue: null,
        storageArea: localStorage,
      }),
    );

    await flushMicrotasks();

    expect(service.isAuthenticated()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
