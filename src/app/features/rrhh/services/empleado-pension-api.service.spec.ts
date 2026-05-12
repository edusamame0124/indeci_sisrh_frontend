import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmpleadoPensionApiService } from './empleado-pension-api.service';
import type { EmpleadoPensionInput, EmpleadoPensionRow } from '../models/empleado-pension.model';

describe('EmpleadoPensionApiService', () => {
  let service: EmpleadoPensionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmpleadoPensionApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpleadoPensionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar extrae data', () => {
    const data: EmpleadoPensionRow[] = [
      {
        id: 1,
        afpId: 2,
        tipo: 'AFP',
        cuspp: 'X',
        porcentajeAporte: 10,
        activo: 1,
      },
    ];
    let out;
    service.listar(5).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/pension/5');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('actualizar PUT', () => {
    const body: EmpleadoPensionInput = {
      empleadoId: 1,
      afpId: 2,
      tipo: 'AFP',
      cuspp: 'ABC',
      porcentajeAporte: 10,
      porcentajeComision: null,
      porcentajeSeguro: null,
    };
    let done = false;
    service.actualizar(7, body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/pension/7');
    expect(req.request.method).toBe('PUT');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
