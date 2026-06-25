import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConceptoRtpsApiService } from './concepto-rtps-api.service';
import type { ConceptoRtps } from '../models/concepto-rtps.model';

describe('ConceptoRtpsApiService (SPEC_CONCEPTOS_PLANILLA §10 — catálogo PDT 601)', () => {
  let service: ConceptoRtpsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConceptoRtpsApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConceptoRtpsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar GET /api/rrhh/concepto-rtps preserva ceros del código', () => {
    const data: ConceptoRtps[] = [
      { codigo: '0700', descripcion: 'DESCUENTOS', esGrupo: 'S', orden: 7 },
      { codigo: '0703', descripcion: 'DESC. AUTORIZADO', esGrupo: 'N', grupoCodigo: '0700', orden: 73 },
    ];
    let out: readonly ConceptoRtps[] | undefined;
    service.listar().subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-rtps');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out?.[1].codigo).toBe('0703');
    expect(out?.[0].esGrupo).toBe('S');
  });
});
