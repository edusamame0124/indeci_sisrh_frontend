import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ImportVinculacionApiService } from './import-vinculacion-api.service';
import type { ImportCommit, ImportPreview } from '../models/import-vinculacion.model';

describe('ImportVinculacionApiService', () => {
  let service: ImportVinculacionApiService;
  let httpMock: HttpTestingController;

  const archivo = new File(['x'], 'vinculacion.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ImportVinculacionApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ImportVinculacionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('previsualizar hace POST multipart a /preview y extrae la data', () => {
    const data: ImportPreview = {
      total: 3,
      importables: 2,
      conError: 1,
      conAdvertencia: 0,
      filas: [
        { numeroFila: 3, dni: '24485494', nombre: 'QUISPE ROSA', estado: 'OK', issues: [] },
      ],
    };
    let out: ImportPreview | undefined;
    service.previsualizar(archivo).subscribe((x) => (out = x));

    const req = httpMock.expectOne('/api/rrhh/vinculacion/import/preview');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('archivo')).toBeInstanceOf(File);
    req.flush({ estado: 'OK', mensaje: 'Vista previa generada', data });

    expect(out).toEqual(data);
  });

  it('importar hace POST a /commit y extrae el resumen', () => {
    const data: ImportCommit = {
      total: 3,
      creados: 2,
      actualizados: 0,
      omitidos: 1,
      errores: [],
    };
    let out: ImportCommit | undefined;
    service.importar(archivo).subscribe((x) => (out = x));

    const req = httpMock.expectOne('/api/rrhh/vinculacion/import/commit');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ estado: 'OK', mensaje: 'Importación completada', data });

    expect(out).toEqual(data);
  });
});
