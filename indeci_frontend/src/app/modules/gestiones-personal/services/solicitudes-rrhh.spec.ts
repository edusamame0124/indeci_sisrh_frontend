import { TestBed } from '@angular/core/testing';

import { SolicitudesRrhh } from './solicitudes-rrhh';

describe('SolicitudesRrhh', () => {
  let service: SolicitudesRrhh;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolicitudesRrhh);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
