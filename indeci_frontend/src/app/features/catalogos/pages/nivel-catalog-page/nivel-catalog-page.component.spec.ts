import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NivelCatalogPageComponent } from './nivel-catalog-page.component';

describe('NivelCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NivelCatalogPageComponent],
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

  it('config apunta a /api/catalogos/niveles', () => {
    const fixture = TestBed.createComponent(NivelCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Nivel');
    const req = httpMock.expectOne('/api/catalogos/niveles');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, codigo: 'N1', nombre: 'Nivel 1' }] });
  });
});
