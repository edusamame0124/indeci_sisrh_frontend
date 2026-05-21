import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmpleadoPuestoApiService } from './empleado-puesto-api.service';
import type { EmpleadoPuestoInput, EmpleadoPuestoRow } from '../models/empleado-puesto.model';

describe('EmpleadoPuestoApiService', () => {
  let service: EmpleadoPuestoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmpleadoPuestoApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpleadoPuestoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar extrae data', () => {
    const data: EmpleadoPuestoRow[] = [
      {
        id: 1,
        cargo: 'ANALISTA',
        nivelId: 2,
        sedeId: null,
        oficinaId: 4,
        jefeId: 9,
        activo: 1,
      },
    ];
    let out: readonly EmpleadoPuestoRow[] | undefined;
    service.listar(9).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/puesto/9');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('guardar POST', () => {
    const body: EmpleadoPuestoInput = { empleadoId: 1, cargo: 'COORDINADOR' };
    let done = false;
    service.guardar(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/puesto');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('actualizar PUT', () => {
    const body: EmpleadoPuestoInput = { empleadoId: 1, cargo: 'PROGRAMADOR' };
    let done = false;
    service.actualizar(5, body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/puesto/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
