import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RegimenLaboralCatalogPageComponent } from './regimen-laboral-catalog-page.component';

describe('RegimenLaboralCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegimenLaboralCatalogPageComponent],
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

  it('config apunta a /api/catalogos/regimenes-laborales', () => {
    const fixture = TestBed.createComponent(RegimenLaboralCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Régimen laboral');
    const req = httpMock.expectOne('/api/catalogos/regimenes-laborales');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, codigo: 'DL276', nombre: 'D.L. 276', activo: 1 }],
    });
  });
});
