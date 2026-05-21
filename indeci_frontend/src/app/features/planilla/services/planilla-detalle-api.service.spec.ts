import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PlanillaDetalleApiService } from './planilla-detalle-api.service';
import type { PlanillaDetalleRow } from '../models/planilla-detalle.model';

describe('PlanillaDetalleApiService (Spec 009 / T150)', () => {
  let service: PlanillaDetalleApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlanillaDetalleApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PlanillaDetalleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listarDetalle GET /planilla-detalle/{empId}/{periodo}', () => {
    const data: PlanillaDetalleRow[] = [
      {
        id: 1,
        conceptoPlanillaId: 100,
        codigoConcepto: 'INGR_BASICO',
        concepto: 'Sueldo básico',
        tipoConcepto: 'INGRESO',
        monto: 3500,
        cantidad: 1,
        observacion: null,
      },
      {
        id: 2,
        conceptoPlanillaId: 200,
        codigoConcepto: 'DESC_AFP',
        concepto: 'Aporte AFP',
        tipoConcepto: 'DESCUENTO',
        monto: 380,
        cantidad: 1,
        observacion: 'INTEGRA 10.85%',
      },
    ];

    let resultado: readonly PlanillaDetalleRow[] | undefined;
    service.listarDetalle(42, '2026-05').subscribe((r) => (resultado = r));

    const req = httpMock.expectOne('/api/rrhh/planilla-detalle/42/2026-05');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });

    expect(resultado).toEqual(data);
    expect(resultado?.[0].tipoConcepto).toBe('INGRESO');
    expect(resultado?.[1].tipoConcepto).toBe('DESCUENTO');
  });
});
