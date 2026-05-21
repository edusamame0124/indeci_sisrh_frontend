import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OficinaCatalogPageComponent } from './oficina-catalog-page.component';

describe('OficinaCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OficinaCatalogPageComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('config apunta a /api/catalogos/oficinas y permite búsqueda por sedeId', () => {
    const fixture = TestBed.createComponent(OficinaCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Oficina');
    expect(fixture.componentInstance.config.searchKeys).toContain('sedeId');
    const req = httpMock.expectOne('/api/catalogos/oficinas');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, sedeId: 1, nombre: 'TIC', sigla: 'TIC', activo: 1 }],
    });
  });
});
