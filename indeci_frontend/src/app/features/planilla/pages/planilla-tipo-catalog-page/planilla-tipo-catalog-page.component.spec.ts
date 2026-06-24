import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService } from '../../../../core/services/auth.service';
import { PlanillaTipoCatalogPageComponent } from './planilla-tipo-catalog-page.component';

describe('PlanillaTipoCatalogPageComponent (SPEC_CONCEPTOS_PLANILLA §15 — Fase A)', () => {
  let httpMock: HttpTestingController;

  function configure(roles: readonly string[]): void {
    TestBed.configureTestingModule({
      imports: [PlanillaTipoCatalogPageComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'roles').mockReturnValue([...roles]);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('lista tipos de planilla vía GET /api/rrhh/planilla-tipo', () => {
    configure(['ADMIN']);
    const fixture = TestBed.createComponent(PlanillaTipoCatalogPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/rrhh/planilla-tipo');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ codigo: 'CAS', nombre: 'CAS', orden: 1, activo: 1 }],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().length).toBe(1);
    expect(fixture.componentInstance.displayCols()).toContain('acciones');
  });

  it('rol sin PLA_WRITE (EMPLEADO) no muestra la columna de acciones', () => {
    configure(['EMPLEADO']);
    const fixture = TestBed.createComponent(PlanillaTipoCatalogPageComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/planilla-tipo').flush({ estado: 'OK', mensaje: 'ok', data: [] });
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.canWrite()).toBe(false);
    expect(comp.displayCols()).not.toContain('acciones');
  });
});
