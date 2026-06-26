import { TestBed } from '@angular/core/testing';

import { LegajoApiService } from './legajo-api';

describe('LegajoApiService', () => {
  let service: LegajoApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajoApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
