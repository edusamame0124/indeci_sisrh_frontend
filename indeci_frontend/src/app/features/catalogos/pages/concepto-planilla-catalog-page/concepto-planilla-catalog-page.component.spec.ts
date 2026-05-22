import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService } from '../../../../core/services/auth.service';
import { ConceptoPlanillaCatalogPageComponent } from './concepto-planilla-catalog-page.component';

describe('ConceptoPlanillaCatalogPageComponent (Spec 009 — CRUD Conceptos)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConceptoPlanillaCatalogPageComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'roles').mockReturnValue(['ADMIN']);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista conceptos vía GET /api/rrhh/concepto-planilla', () => {
    const fixture = TestBed.createComponent(ConceptoPlanillaCatalogPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/rrhh/concepto-planilla');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [
        {
          id: 1,
          codigo: 'I-001',
          nombre: 'HABER',
          tipo: 'INGRESO',
          naturaleza: 'REM',
          activo: 1,
        },
      ],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('RRHH_ADMIN no tiene columnas de acciones', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConceptoPlanillaCatalogPageComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(ConceptoPlanillaCatalogPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/concepto-planilla').flush({ estado: 'OK', mensaje: 'ok', data: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.displayCols()).not.toContain('acciones');
  });
});
