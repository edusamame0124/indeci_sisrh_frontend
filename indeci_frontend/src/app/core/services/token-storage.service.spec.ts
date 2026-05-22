import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('isAvailable returns true when localStorage works', () => {
    expect(service.isAvailable()).toBe(true);
  });

  it('setAccess and getAccess round-trip', () => {
    service.setAccess('access-123');
    expect(service.getAccess()).toBe('access-123');
  });

  it('clearAll removes the access token', () => {
    service.setAccess('a');
    service.clearAll();
    expect(service.getAccess()).toBeNull();
  });

  it('returns null when key absent', () => {
    expect(service.getAccess()).toBeNull();
  });
});
