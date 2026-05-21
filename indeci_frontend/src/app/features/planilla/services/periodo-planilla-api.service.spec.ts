import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PeriodoPlanillaApiService } from './periodo-planilla-api.service';
import type {
  PeriodoPlanillaInput,
  PeriodoPlanillaRow,
} from '../models/periodo-planilla.model';

describe('PeriodoPlanillaApiService (Spec 009 — periodos)', () => {
  let service: PeriodoPlanillaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PeriodoPlanillaApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PeriodoPlanillaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar GET extrae data', () => {
    const data: PeriodoPlanillaRow[] = [
      {
        id: 1,
        periodo: '2026-05',
        fechaInicio: '2026-05-01',
        fechaFin: '2026-05-31',
        estado: 'ABIERTO',
        observacion: 'Mes actual',
        fechaCierre: null,
        activo: 1,
      },
    ];
    let out: readonly PeriodoPlanillaRow[] | undefined;
    service.listar().subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/periodo-planilla');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('crear POST envía PeriodoPlanillaInput', () => {
    const body: PeriodoPlanillaInput = {
      periodo: '2026-06',
      fechaInicio: '2026-06-01',
      fechaFin: '2026-06-30',
      observacion: 'Nuevo',
    };
    let done = false;
    service.crear(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/periodo-planilla');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('cerrar PUT con id', () => {
    let done = false;
    service.cerrar(7).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/periodo-planilla/cerrar/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('reabrir PUT con id', () => {
    let done = false;
    service.reabrir(7).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/periodo-planilla/reabrir/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('eliminar DELETE', () => {
    let done = false;
    service.eliminar(5).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/periodo-planilla/5');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
