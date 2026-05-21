import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CondicionLaboralCatalogPageComponent } from './condicion-laboral-catalog-page.component';

describe('CondicionLaboralCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CondicionLaboralCatalogPageComponent],
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

  it('config apunta a /api/catalogos/condiciones-laborales', () => {
    const fixture = TestBed.createComponent(CondicionLaboralCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Condición laboral');
    const req = httpMock.expectOne('/api/catalogos/condiciones-laborales');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, codigo: 'ACT', nombre: 'Activo', activo: 1 }],
    });
  });
});
