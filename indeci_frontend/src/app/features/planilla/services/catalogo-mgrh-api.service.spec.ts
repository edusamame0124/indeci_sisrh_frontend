import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CatalogoMgrhApiService } from './catalogo-mgrh-api.service';

/**
 * Service de consulta paginada del catálogo MGRH / MEF
 * (SPEC_HOMOLOGACION_MGRH §E · §D4).
 */
describe('CatalogoMgrhApiService', () => {
  let service: CatalogoMgrhApiService;
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoMgrhApiService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('arma los params con filtros no vacíos y extrae la Page de ApiResponse.data', () => {
    setup();
    let total = -1;
    service
      .buscar(
        { codigo: ' 0101 ', tipo: 'INGRESOS', descripcion: '', soloSeleccionables: true },
        0,
        20,
      )
      .subscribe((page) => (total = page.totalElements));

    const req = http.expectOne((r) => r.url === '/api/rrhh/catalogo-mgrh');
    expect(req.request.params.get('codigo')).toBe('0101'); // trim
    expect(req.request.params.get('tipo')).toBe('INGRESOS');
    expect(req.request.params.has('descripcion')).toBe(false); // vacío no se envía
    expect(req.request.params.get('soloSeleccionables')).toBe('true');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');

    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: { content: [], totalElements: 7, totalPages: 1, size: 20, number: 0 },
    });
    expect(total).toBe(7);
  });

  it('omite los flags soloSeleccionables/soloVigentes cuando no se especifican', () => {
    setup();
    service.buscar({}, 1, 5).subscribe();
    const req = http.expectOne((r) => r.url === '/api/rrhh/catalogo-mgrh');
    expect(req.request.params.has('soloSeleccionables')).toBe(false);
    expect(req.request.params.has('soloVigentes')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: { content: [], totalElements: 0, totalPages: 0, size: 5, number: 1 },
    });
  });
});
