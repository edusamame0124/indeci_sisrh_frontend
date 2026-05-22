import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MovimientoPlanillaApiService } from './movimiento-planilla-api.service';
import type { MovimientoPlanillaRow } from '../models/movimiento-planilla.model';

describe('MovimientoPlanillaApiService (Spec 009 / T149)', () => {
  let service: MovimientoPlanillaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MovimientoPlanillaApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(MovimientoPlanillaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const ejemplo = (): MovimientoPlanillaRow => ({
    id: 1,
    empleadoId: 42,
    periodo: '2026-05',
    totalIngresos: 4500,
    totalDescuentos: 600,
    netoPagar: 3900,
    estado: 'PENDIENTE',
    observacion: null,
    activo: 1,
    neto50pctMinimo: null,
    estadoNeto: null,
  });

  it('obtenerEmpleado GET /movimiento-planilla/{empId}/{periodo}', () => {
    const data = ejemplo();
    let resultado: MovimientoPlanillaRow | undefined;
    service.obtenerEmpleado(42, '2026-05').subscribe((r) => (resultado = r));

    const req = httpMock.expectOne('/api/rrhh/movimiento-planilla/42/2026-05');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(resultado).toEqual(data);
  });

  it('listarPeriodo GET /movimiento-planilla/periodo/{periodo}', () => {
    const data = [ejemplo()];
    let resultado: readonly MovimientoPlanillaRow[] | undefined;
    service.listarPeriodo('2026-05').subscribe((r) => (resultado = r));

    const req = httpMock.expectOne('/api/rrhh/movimiento-planilla/periodo/2026-05');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(resultado).toEqual(data);
  });

  it('eliminar DELETE /movimiento-planilla/{id}', () => {
    let done = false;
    service.eliminar(7).subscribe(() => (done = true));
    const req = httpMock.expectOne('/api/rrhh/movimiento-planilla/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('cambiarEstado PUT /movimiento-planilla/{id}/estado/{estado}', () => {
    let done = false;
    service.cambiarEstado(7, 'PROCESADO').subscribe(() => (done = true));
    const req = httpMock.expectOne('/api/rrhh/movimiento-planilla/7/estado/PROCESADO');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
