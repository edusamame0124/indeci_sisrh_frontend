import { TestBed } from '@angular/core/testing';

import { TeletrabajoApi } from './teletrabajo-api';

describe('TeletrabajoApi', () => {
  let service: TeletrabajoApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeletrabajoApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
