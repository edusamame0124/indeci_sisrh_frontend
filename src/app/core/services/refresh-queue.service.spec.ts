import { describe, expect, it, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { RefreshQueueService } from './refresh-queue.service';

describe('RefreshQueueService', () => {
  let queue: RefreshQueueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    queue = TestBed.inject(RefreshQueueService);
  });

  it('isRefreshing toggles correctly', () => {
    expect(queue.isRefreshing).toBe(false);
    queue.startRefresh();
    expect(queue.isRefreshing).toBe(true);
    queue.completeRefresh('new-token');
    expect(queue.isRefreshing).toBe(false);
  });

  it('failRefresh resets isRefreshing', () => {
    queue.startRefresh();
    queue.failRefresh();
    expect(queue.isRefreshing).toBe(false);
  });

  it('waitForNewToken$ resolves when completeRefresh is called', async () => {
    queue.startRefresh();
    const promise = firstValueFrom(queue.waitForNewToken$());
    queue.completeRefresh('TOKEN_XYZ');
    await expect(promise).resolves.toBe('TOKEN_XYZ');
  });

  it('multiple subscribers all receive the new token (fan-out)', async () => {
    queue.startRefresh();
    const promises = [
      firstValueFrom(queue.waitForNewToken$()),
      firstValueFrom(queue.waitForNewToken$()),
      firstValueFrom(queue.waitForNewToken$()),
    ];
    queue.completeRefresh('SHARED_TOKEN');
    const results = await Promise.all(promises);
    expect(results).toEqual(['SHARED_TOKEN', 'SHARED_TOKEN', 'SHARED_TOKEN']);
  });
});
