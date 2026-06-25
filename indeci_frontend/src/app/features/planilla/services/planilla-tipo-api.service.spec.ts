import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlanillaTipoApiService } from './planilla-tipo-api.service';
import type { PlanillaTipoInput } from '../models/planilla-tipo.model';

describe('PlanillaTipoApiService (SPEC_CONCEPTOS_PLANILLA §15 — Fase A)', () => {
  let service: PlanillaTipoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlanillaTipoApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlanillaTipoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar GET /api/rrhh/planilla-tipo devuelve la data del ApiResponse', () => {
    let result: readonly { codigo: string }[] = [];
    service.listar().subscribe((r) => (result = r));
    const req = httpMock.expectOne('/api/rrhh/planilla-tipo');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ codigo: 'CAS', nombre: 'CAS', orden: 1, activo: 1 }],
    });
    expect(result.map((r) => r.codigo)).toEqual(['CAS']);
  });

  it('crear POST envía el payload del catálogo', () => {
    const body: PlanillaTipoInput = { codigo: 'CAS_TEMP', nombre: 'CAS TEMPORAL', orden: 2, activo: 1 };
    let done = false;
    service.crear(body).subscribe(() => (done = true));
    const req = httpMock.expectOne('/api/rrhh/planilla-tipo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('actualizar PUT por código', () => {
    const body: PlanillaTipoInput = { codigo: 'CAS', nombre: 'CAS', orden: 1, activo: 1 };
    service.actualizar('CAS', body).subscribe();
    const req = httpMock.expectOne('/api/rrhh/planilla-tipo/CAS');
    expect(req.request.method).toBe('PUT');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
  });

  it('eliminar DELETE por código (baja lógica)', () => {
    service.eliminar('CAS').subscribe();
    const req = httpMock.expectOne('/api/rrhh/planilla-tipo/CAS');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
  });
});
