import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmpleadoPlanillaApiService } from './empleado-planilla-api.service';
import type { EmpleadoPlanillaInput, EmpleadoPlanillaRow } from '../models/empleado-planilla.model';

describe('EmpleadoPlanillaApiService', () => {
  let service: EmpleadoPlanillaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmpleadoPlanillaApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpleadoPlanillaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar extrae data', () => {
    const data: EmpleadoPlanillaRow[] = [
      {
        id: 1,
        sueldoBasico: 3500,
        movilidad: null,
        alimentacion: 100,
        tieneAsignacionFamiliar: 1,
        numHijos: 2,
        activo: 1,
        descuentoBanco: 250,
        descuentoInstitucion: null,
      },
    ];
    let out: readonly EmpleadoPlanillaRow[] | undefined;
    service.listar(9).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/planilla/9');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('guardar POST', () => {
    const body: EmpleadoPlanillaInput = {
      empleadoId: 1,
      sueldoBasico: 3000,
      tieneAsignacionFamiliar: 0,
    };
    let done = false;
    service.guardar(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/planilla');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('actualizar PUT', () => {
    const body: EmpleadoPlanillaInput = {
      empleadoId: 1,
      sueldoBasico: 3200,
    };
    let done = false;
    service.actualizar(5, body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/planilla/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
