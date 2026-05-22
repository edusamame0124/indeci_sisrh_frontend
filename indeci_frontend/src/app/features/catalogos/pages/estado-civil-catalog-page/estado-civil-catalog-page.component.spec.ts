import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstadoCivilCatalogPageComponent } from './estado-civil-catalog-page.component';

describe('EstadoCivilCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstadoCivilCatalogPageComponent],
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

  it('config apunta a /api/catalogos/estados-civiles', () => {
    const fixture = TestBed.createComponent(EstadoCivilCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Estado civil');
    const req = httpMock.expectOne('/api/catalogos/estados-civiles');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, codigo: 'S', nombre: 'Soltero(a)' }] });
  });
});
