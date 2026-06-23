import { TestBed } from '@angular/core/testing';

import { AsistenciaEmpleadoApi } from './asistencia-empleado-api';

describe('AsistenciaEmpleadoApi', () => {
  let service: AsistenciaEmpleadoApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsistenciaEmpleadoApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
