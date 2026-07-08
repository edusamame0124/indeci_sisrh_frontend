import { TestBed } from '@angular/core/testing';

import { LbsApiService } from './lbs-api.service';

describe('LbsApiService', () => {
  let service: LbsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LbsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
