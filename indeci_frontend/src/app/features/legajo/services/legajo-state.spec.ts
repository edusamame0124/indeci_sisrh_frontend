import { TestBed } from '@angular/core/testing';

import { LegajoStateService } from './legajo-state';

describe('LegajoStateService', () => {
  let service: LegajoStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajoStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
