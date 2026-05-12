import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { JwtService } from './jwt.service';

/**
 * Helper: encode arbitrary JSON to base64url for fake JWT payload.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.fake-signature`;
}

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JwtService);
  });

  describe('decode', () => {
    it('returns null for null/undefined/empty input', () => {
      expect(service.decode(null)).toBeNull();
      expect(service.decode(undefined)).toBeNull();
      expect(service.decode('')).toBeNull();
    });

    it('returns null for malformed JWT (wrong number of parts)', () => {
      expect(service.decode('not.a.jwt.at.all')).toBeNull();
      expect(service.decode('only-one-part')).toBeNull();
    });

    it('returns null for invalid JSON in payload', () => {
      expect(service.decode('header.not-base64-json.sig')).toBeNull();
    });

    it('decodes a valid JWT payload', () => {
      const token = makeJwt({ sub: 'jdoe', exp: 1234567890, roles: ['ADMIN'] });
      const decoded = service.decode<{ sub: string; exp: number; roles: string[] }>(token);
      expect(decoded).toEqual({ sub: 'jdoe', exp: 1234567890, roles: ['ADMIN'] });
    });
  });

  describe('isExpired', () => {
    it('returns true for null/empty token', () => {
      expect(service.isExpired(null)).toBe(true);
      expect(service.isExpired('')).toBe(true);
    });

    it('returns true when exp is in the past', () => {
      const token = makeJwt({ sub: 'x', exp: 1000 }); // year 1970
      expect(service.isExpired(token)).toBe(true);
    });

    it('returns false when exp is in the future', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ sub: 'x', exp: future });
      expect(service.isExpired(token)).toBe(false);
    });

    it('returns true when exp is missing', () => {
      const token = makeJwt({ sub: 'x' });
      expect(service.isExpired(token)).toBe(true);
    });
  });
});
