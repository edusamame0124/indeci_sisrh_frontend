import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConceptoPlanillaApiService } from './concepto-planilla-api.service';
import type {
  ConceptoPlanillaInput,
  ConceptoPlanillaRow,
} from '../models/concepto-planilla.model';

describe('ConceptoPlanillaApiService (Spec 009 — CRUD Conceptos)', () => {
  let service: ConceptoPlanillaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConceptoPlanillaApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConceptoPlanillaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar GET extrae data', () => {
    const data: ConceptoPlanillaRow[] = [
      {
        id: 1,
        codigo: 'I-001',
        nombre: 'Haber básico',
        tipo: 'INGRESO',
        naturaleza: 'REMUNERATIVO',
        activo: 1,
      },
    ];
    let out;
    service.listar().subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('guardar POST envía payload', () => {
    const body: ConceptoPlanillaInput = {
      codigo: 'D-100',
      nombre: 'Descuento por AFP',
      tipo: 'DESCUENTO',
      naturaleza: 'OBLIGATORIO',
    };
    let done = false;
    service.guardar(body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('actualizar PUT con id', () => {
    const body: ConceptoPlanillaInput = {
      codigo: 'I-001',
      nombre: 'Haber básico actualizado',
      tipo: 'INGRESO',
      naturaleza: 'REMUNERATIVO',
    };
    let done = false;
    service.actualizar(5, body).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('eliminar DELETE', () => {
    let done = false;
    service.eliminar(5).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla/5');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
