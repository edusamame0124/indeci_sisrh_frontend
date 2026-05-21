import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoContratoCatalogPageComponent } from './tipo-contrato-catalog-page.component';

describe('TipoContratoCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TipoContratoCatalogPageComponent],
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

  it('config apunta a /api/catalogos/tipos-contrato', () => {
    const fixture = TestBed.createComponent(TipoContratoCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Tipo de contrato');
    const req = httpMock.expectOne('/api/catalogos/tipos-contrato');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, codigo: 'IND', nombre: 'Indeterminado', activo: 1 }],
    });
  });
});
