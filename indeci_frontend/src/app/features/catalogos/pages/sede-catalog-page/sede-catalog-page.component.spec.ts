import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SedeCatalogPageComponent } from './sede-catalog-page.component';

describe('SedeCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SedeCatalogPageComponent],
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

  it('config apunta a /api/catalogos/sedes', () => {
    const fixture = TestBed.createComponent(SedeCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Sede');
    expect(fixture.componentInstance.config.columnas.map((c) => c.key)).toEqual([
      'nombre',
      'direccion',
      'telefono',
      'activo',
    ]);
    const req = httpMock.expectOne('/api/catalogos/sedes');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [] });
  });
});
