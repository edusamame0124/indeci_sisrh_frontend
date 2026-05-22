import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfesionCatalogPageComponent } from './profesion-catalog-page.component';

describe('ProfesionCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfesionCatalogPageComponent],
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

  it('config apunta a /api/catalogos/profesiones y formatea activo', () => {
    const fixture = TestBed.createComponent(ProfesionCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Profesión');
    const activoCol = fixture.componentInstance.config.columnas.find((c) => c.key === 'activo');
    expect(activoCol?.formatter?.(1, {})).toBe('Sí');
    expect(activoCol?.formatter?.(0, {})).toBe('No');
    const req = httpMock.expectOne('/api/catalogos/profesiones');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, nombre: 'INGENIERÍA', activo: 1 }] });
  });
});
