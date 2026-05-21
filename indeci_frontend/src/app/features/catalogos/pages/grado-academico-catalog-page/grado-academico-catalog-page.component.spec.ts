import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GradoAcademicoCatalogPageComponent } from './grado-academico-catalog-page.component';

describe('GradoAcademicoCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GradoAcademicoCatalogPageComponent],
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

  it('config apunta a /api/catalogos/grados-academicos', () => {
    const fixture = TestBed.createComponent(GradoAcademicoCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Grado académico');
    const req = httpMock.expectOne('/api/catalogos/grados-academicos');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, nombre: 'BACHILLER', activo: 1 }] });
  });
});
