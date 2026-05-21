import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RegimenPensionarioCatalogPageComponent } from './regimen-pensionario-catalog-page.component';

describe('RegimenPensionarioCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegimenPensionarioCatalogPageComponent],
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

  it('config apunta a /api/catalogos/regimenes-pensionarios e incluye columna tipo', () => {
    const fixture = TestBed.createComponent(RegimenPensionarioCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Régimen pensionario');
    expect(fixture.componentInstance.config.columnas.map((c) => c.key)).toContain('tipo');
    const req = httpMock.expectOne('/api/catalogos/regimenes-pensionarios');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, codigo: 'INT', nombre: 'INTEGRA', tipo: 'AFP', activo: 1 }],
    });
  });
});
