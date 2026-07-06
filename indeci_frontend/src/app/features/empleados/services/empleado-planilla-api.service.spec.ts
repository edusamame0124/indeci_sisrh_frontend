import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmpleadoPlanillaApiService } from './empleado-planilla-api.service';
import type { EmpleadoPlanillaInput, EmpleadoPlanillaRow } from '../models/empleado-planilla.model';
import type { IncrementosDsResponse } from '../models/incrementos-ds.model';

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
        sueldoBasico: 4864.19,
        codigoAirhsp: '000051',
        montoContrato: 4500,
        movilidad: null,
        alimentacion: 100,
        tieneAsignacionFamiliar: 1,
        numHijos: 2,
        activo: 1,
        descuentoBanco: 250,
        descuentoInstitucion: null,
        regimenLaboralId: 3,
        tipoContratoId: null,
        condicionLaboralId: null,
        regimenLaboral: 'CAS',
        tipoContrato: null,
        condicionLaboral: null,
        tipoPersonaMefId: null,
        registroPlazaAirhsp: null,
        fechaInicioContrato: null,
      } as unknown as EmpleadoPlanillaRow,
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
      codigoAirhsp: '000051',
      montoContrato: 4500,
      sueldoBasico: 4864.19,
      tieneAsignacionFamiliar: 0,
      regimenLaboralId: 3,
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
      codigoAirhsp: '000051',
      montoContrato: 4500,
      sueldoBasico: 4864.19,
      regimenLaboralId: 3,
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

  it('calcularIncrementosDs GET con query params', () => {
    const data: IncrementosDsResponse = {
      aplica: true,
      montoContrato: 4500,
      incrementos: [],
      totalIncrementos: 364.19,
      remuneracionMensual: 4864.19,
    };
    let out: IncrementosDsResponse | undefined;
    service
      .calcularIncrementosDs({
        regimenLaboralId: 3,
        condicionLaboralId: 2,
        montoContratado: 4500,
      })
      .subscribe((x) => {
        out = x;
      });
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/rrhh/planilla/incrementos-ds' &&
        r.params.get('regimenLaboralId') === '3' &&
        r.params.get('condicionLaboralId') === '2' &&
        r.params.get('montoContratado') === '4500',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });
});
