import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmpleadoBancoApiService } from './empleado-banco-api.service';
import type { EmpleadoBancoInput, EmpleadoBancoRow } from '../models/empleado-banco.model';

describe('EmpleadoBancoApiService', () => {
  let service: EmpleadoBancoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmpleadoBancoApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpleadoBancoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar extrae data', () => {
    const data: EmpleadoBancoRow[] = [
      {
        id: 1,
        bankId: 2,
        numeroCuenta: '123',
        cci: '999',
        esCuentaPlanilla: 1,
        activo: 1,
      },
    ];
    let out;
    service.listar(9).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/banco/9');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('guardar POST', () => {
    const body: EmpleadoBancoInput = {
      empleadoId: 1,
      bankId: 2,
      accountTypeId: 3,
      numeroCuenta: '001',
      cci: '',
      esCuentaPlanilla: 0,
    };
    let done = false;
    service.guardar(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/banco');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
