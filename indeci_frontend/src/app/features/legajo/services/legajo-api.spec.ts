import { TestBed } from '@angular/core/testing';

import { LegajoApi } from './legajo-api';

describe('LegajoApi', () => {
  let service: LegajoApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajoApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
