import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DependenciaCatalogPageComponent } from './dependencia-catalog-page.component';

describe('DependenciaCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DependenciaCatalogPageComponent],
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

  it('config apunta a /api/catalogos/dependencias', () => {
    const fixture = TestBed.createComponent(DependenciaCatalogPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.config.titulo).toBe('Dependencia');
    const req = httpMock.expectOne('/api/catalogos/dependencias');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, nombre: 'DGE', sigla: 'DGE' }] });
  });
});
