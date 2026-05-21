import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoComisionAfpCatalogPageComponent } from './tipo-comision-afp-catalog-page.component';

describe('TipoComisionAfpCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TipoComisionAfpCatalogPageComponent],
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

  it('config apunta a /api/catalogos/tipos-comision-afp', () => {
    const fixture = TestBed.createComponent(TipoComisionAfpCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Tipo de comisión AFP');
    const req = httpMock.expectOne('/api/catalogos/tipos-comision-afp');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, codigo: 'FL', nombre: 'POR FLUJO' }],
    });
  });
});
