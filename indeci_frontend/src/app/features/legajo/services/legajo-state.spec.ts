import { TestBed } from '@angular/core/testing';

import { LegajoState } from './legajo-state';

describe('LegajoState', () => {
  let service: LegajoState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajoState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
