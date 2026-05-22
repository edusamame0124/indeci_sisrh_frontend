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
        regimenPensionarioId: 2,
        cuspp: '123456789012',
        porcentajeAporte: 10,
        porcentajeComision: 1.5,
        porcentajeSeguro: 1.36,
        tipoComisionAfpId: 3,
        tipoRegimen: 'AFP',
        activo: 1,
        regimenPensionario: 'INTEGRA',
        tipoComisionAfp: 'POR FLUJO',
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

  it('guardar POST envía nuevo contrato', () => {
    const body: EmpleadoPensionInput = {
      empleadoId: 1,
      regimenPensionarioId: 2,
      cuspp: '123456789012',
      porcentajeAporte: 10,
      porcentajeComision: 1.5,
      porcentajeSeguro: 1.36,
      tipoComisionAfpId: 3,
      tipoRegimen: 'AFP',
    };
    let done = false;
    service.guardar(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/pension');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('actualizar PUT con nuevo contrato', () => {
    const body: EmpleadoPensionInput = {
      empleadoId: 1,
      regimenPensionarioId: 4,
      cuspp: '123456789012',
      porcentajeAporte: 10,
      porcentajeComision: null,
      porcentajeSeguro: null,
      tipoComisionAfpId: null,
      tipoRegimen: 'ONP',
    };
    let done = false;
    service.actualizar(7, body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/pension/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('eliminar DELETE', () => {
    let done = false;
    service.eliminar(7).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/pension/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
