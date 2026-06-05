import { TestBed } from '@angular/core/testing';

import { SolicitudesRrhhService } from './solicitudes-rrhh';

describe('SolicitudesRrhh', () => {
  let service: SolicitudesRrhhService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolicitudesRrhhService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
