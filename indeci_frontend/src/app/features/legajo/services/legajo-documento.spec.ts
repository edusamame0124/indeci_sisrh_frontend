import { TestBed } from '@angular/core/testing';

import { LegajoDocumento } from './legajo-documento';

describe('LegajoDocumento', () => {
  let service: LegajoDocumento;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajoDocumento);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
