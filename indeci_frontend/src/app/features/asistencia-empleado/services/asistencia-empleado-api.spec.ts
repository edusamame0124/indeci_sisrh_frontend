import { TestBed } from '@angular/core/testing';

import { AsistenciaEmpleadoApiService } from './asistencia-empleado-api';

describe('AsistenciaEmpleadoApiService', () => {
  let service: AsistenciaEmpleadoApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsistenciaEmpleadoApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
