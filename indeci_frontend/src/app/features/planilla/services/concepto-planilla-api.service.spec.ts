import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConceptoPlanillaApiService } from './concepto-planilla-api.service';
import type {
  ConceptoPlanillaInput,
  ConceptoPlanillaRow,
} from '../models/concepto-planilla.model';

describe('ConceptoPlanillaApiService (SPEC_CONCEPTOS_PLANILLA — CRUD Conceptos)', () => {
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

  it('guardar POST envía payload completo (5 tabs)', () => {
    const body: ConceptoPlanillaInput = {
      codigo: 'D-100',
      nombre: 'Descuento por AFP',
      tipo: 'DESCUENTO',
      naturaleza: 'OBLIGATORIO',
      tipoConcepto: 'APORTE_TRABAJADOR',
      afectoAportePens: 'S',
      regimenAplicable: 'TODOS',
      esProrrateable: 'N',
      planillaTipos: ['CAS'],
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
      planillaTipos: ['CAS', 'CAS_TEMP'],
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

  it.each([
    ['enviarRevision', 'enviar-revision'],
    ['activar', 'activar'],
    ['cerrar', 'cerrar'],
    ['anular', 'anular'],
  ] as const)('%s POST /{id}/%s', (metodo, accion) => {
    let done = false;
    (service[metodo] as (id: number) => ReturnType<typeof service.activar>)(7).subscribe(
      () => {
        done = true;
      },
    );
    const req = httpMock.expectOne(`/api/rrhh/concepto-planilla/7/${accion}`);
    expect(req.request.method).toBe('POST');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  // ─────────── P3 — Historial / versionado (SPEC_CONCEPTOS_PLANILLA §12) ───────────

  it('historial GET /{id}/historial extrae versiones + auditoría', () => {
    const data = {
      versiones: [
        { id: 9, version: 2, vigIni: '2026-07-01', vigFin: null, estado: 'BORRADOR', vigente: false },
        { id: 5, version: 1, vigIni: '2026-01-01', vigFin: '2026-06-30', estado: 'ACTIVO', vigente: true },
      ],
      auditoria: [
        { accion: 'CREAR_VERSION', usuario: 'jperez', fecha: '2026-06-24T10:00:00', detalle: 'v2' },
      ],
    };
    let out;
    service.historial(5).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla/5/historial');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('crearNuevaVersion POST /{id}/nueva-version envía fechaVigIni y devuelve id', () => {
    let out: number | undefined;
    service.crearNuevaVersion(5, '2026-07-01').subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla/5/nueva-version');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fechaVigIni: '2026-07-01' });
    req.flush({ estado: 'OK', mensaje: 'ok', data: 9 });
    expect(out).toBe(9);
  });
});
