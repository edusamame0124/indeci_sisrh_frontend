import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { GeneradorPlanillaApiService } from './generador-planilla-api.service';
import type { ResumenPlanilla } from '../models/resumen-planilla.model';

describe('GeneradorPlanillaApiService (Spec 009 / T151)', () => {
  let service: GeneradorPlanillaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GeneradorPlanillaApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(GeneradorPlanillaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('generarIndividual POST /generador-planilla/{empId}/{periodo}', () => {
    let done = false;
    service.generarIndividual(42, '2026-05').subscribe(() => (done = true));
    const req = httpMock.expectOne('/api/rrhh/generador-planilla/42/2026-05');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('generarMasivo POST /generador-planilla/masivo (BKD-001: void)', () => {
    let done = false;
    const payload: any = { periodo: '2026-05', regimen: '728', concepto: '1000', tipoPlanilla: 'ORDINARIA' };
    service.generarMasivo(payload).subscribe(() => (done = true));
    const req = httpMock.expectOne('/api/rrhh/generador-planilla/masivo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ estado: 'OK', mensaje: 'Planilla masiva generada', data: null });
    expect(done).toBe(true);
  });

  it('obtenerResumen GET /generador-planilla/resumen/{empId}/{periodo}', () => {
    const data: ResumenPlanilla = {
      empleadoId: 42,
      periodo: '2026-05',
      totalIngresos: 4500,
      totalDescuentos: 600,
      netoPagar: 3900,
      neto50pctMinimo: 1950,
      estadoNeto: 'BIEN',
    };
    let resultado: ResumenPlanilla | undefined;
    service.obtenerResumen(42, '2026-05').subscribe((r) => (resultado = r));

    const req = httpMock.expectOne('/api/rrhh/generador-planilla/resumen/42/2026-05');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(resultado).toEqual(data);
  });
});
