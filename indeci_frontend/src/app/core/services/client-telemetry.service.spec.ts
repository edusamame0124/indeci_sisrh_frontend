import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClientTelemetryService } from './client-telemetry.service';

describe('ClientTelemetryService', () => {
  let svc: ClientTelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ClientTelemetryService);
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* silence in tests */
    });
  });

  it('console.error called in dev mode', () => {
    svc.track('REFRESH_TRIGGERED', { url: '/api/test' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('REFRESH_TRIGGERED'),
      expect.objectContaining({ url: '/api/test' }),
    );
  });

  it('NEVER logs sensitive keys from extra (FR-041)', () => {
    svc.track('REFRESH_TRIGGERED', {
      extra: {
        password: 'super-secret',
        codigo: '123456',
        access_token: 'sensitive-jwt',
        userId: 42, // OK, not sensitive
      },
    });
    const calls = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const lastPayload = calls[calls.length - 1][1] as { extra?: Record<string, unknown> };
    const extra = lastPayload.extra ?? {};
    expect(extra['password']).toBeUndefined();
    expect(extra['codigo']).toBeUndefined();
    expect(extra['access_token']).toBeUndefined();
    expect(extra['userId']).toBe(42);
  });

  it('handles empty payload', () => {
    expect(() => svc.track('STORAGE_UNAVAILABLE')).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
