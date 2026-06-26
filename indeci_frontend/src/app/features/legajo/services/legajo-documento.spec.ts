import { TestBed } from '@angular/core/testing';

import { LegajoDocumentoService } from './legajo-documento';

describe('LegajoDocumentoService', () => {
  let service: LegajoDocumentoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajoDocumentoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
