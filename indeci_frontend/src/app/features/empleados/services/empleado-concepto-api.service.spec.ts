import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmpleadoConceptoApiService } from './empleado-concepto-api.service';
import type { EmpleadoConceptoInput, EmpleadoConceptoRow } from '../models/empleado-concepto.model';

describe('EmpleadoConceptoApiService', () => {
  let service: EmpleadoConceptoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EmpleadoConceptoApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EmpleadoConceptoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listarPorEmpleado extrae data', () => {
    const data: EmpleadoConceptoRow[] = [
      {
        id: 1,
        conceptoPlanillaId: 10,
        concepto: 'BASICO',
        monto: 1000,
        porcentaje: null,
        formula: null,
        activo: 1,
      },
    ];
    let out: readonly EmpleadoConceptoRow[] | undefined;
    service.listarPorEmpleado(42).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/empleado-concepto/42');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('guardar POST', () => {
    const body: EmpleadoConceptoInput = {
      empleadoId: 42,
      conceptoPlanillaId: 10,
      monto: 500,
      porcentaje: null,
      formula: null,
    };
    let done = false;
    service.guardar(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/empleado-concepto');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('actualizar PUT', () => {
    const body: EmpleadoConceptoInput = {
      empleadoId: 42,
      conceptoPlanillaId: 10,
      monto: 600,
      porcentaje: null,
      formula: null,
    };
    let done = false;
    service.actualizar(7, body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/empleado-concepto/7');
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
    const req = httpMock.expectOne('/api/rrhh/empleado-concepto/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
