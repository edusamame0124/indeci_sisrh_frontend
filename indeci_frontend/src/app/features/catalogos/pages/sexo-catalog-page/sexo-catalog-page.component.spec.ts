import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SexoCatalogPageComponent } from './sexo-catalog-page.component';

describe('SexoCatalogPageComponent (Spec 009 — Catálogo)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SexoCatalogPageComponent],
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

  it('declara config con titulo "Sexo" y endpoint /api/catalogos/sexos', () => {
    const fixture = TestBed.createComponent(SexoCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Sexo');
    expect(fixture.componentInstance.config.searchKeys).toEqual(['codigo', 'nombre']);

    const req = httpMock.expectOne('/api/catalogos/sexos');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [
        { id: 1, codigo: 'M', nombre: 'Masculino' },
        { id: 2, codigo: 'F', nombre: 'Femenino' },
      ],
    });

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sexo');
  });
});
