import { TestBed } from '@angular/core/testing';

import { TeletrabajoApiService } from './teletrabajo-api';

describe('TeletrabajoApiService', () => {
  let service: TeletrabajoApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeletrabajoApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
