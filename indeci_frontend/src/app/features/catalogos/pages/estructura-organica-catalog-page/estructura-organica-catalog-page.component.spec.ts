import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstructuraOrganicaCatalogPageComponent } from './estructura-organica-catalog-page.component';

describe('EstructuraOrganicaCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstructuraOrganicaCatalogPageComponent],
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

  it('config apunta a /api/catalogos/estructuras-organicas', () => {
    const fixture = TestBed.createComponent(EstructuraOrganicaCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Estructura orgánica');
    const req = httpMock.expectOne('/api/catalogos/estructuras-organicas');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, codigo: '01', nombre: 'DIR' }] });
  });
});
