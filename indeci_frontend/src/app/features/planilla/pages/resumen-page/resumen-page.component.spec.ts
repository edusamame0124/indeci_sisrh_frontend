import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ResumenPageComponent } from './resumen-page.component';

describe('ResumenPageComponent (Spec 009 / T157)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(empleadoId: string = '42', periodo: string = '2026-05') {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: {
            get: (k: string) =>
              k === 'empleadoId' ? empleadoId : k === 'periodo' ? periodo : null,
          },
        },
      },
    };
  }

  function build(empleadoId: string = '42', periodo: string = '2026-05') {
    TestBed.configureTestingModule({
      imports: [ResumenPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(empleadoId, periodo),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(ResumenPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('carga persona + resumen en paralelo y popula los signals', () => {
    const fixture = build('42', '2026-05');

    httpMock.expectOne('/api/rrhh/persona').flush({
      data: [{ id: 7, empleadoId: 42, nombreCompleto: 'Ana Pérez', dni: '11223344', email: 'a@b.pe' }],
    });
    httpMock.expectOne('/api/rrhh/generador-planilla/resumen/42/2026-05').flush({
      data: {
        empleadoId: 42,
        periodo: '2026-05',
        totalIngresos: 3500,
        totalDescuentos: 480,
        netoPagar: 3020,
      },
    });

    const comp = fixture.componentInstance;
    expect(comp.persona()?.nombreCompleto).toBe('Ana Pérez');
    expect(comp.resumen()?.totalIngresos).toBe(3500);
    expect(comp.resumen()?.netoPagar).toBe(3020);
    expect(comp.loading()).toBe(false);
  });

  it('persona() es null si no hay coincidencia por empleadoId', () => {
    const fixture = build('99', '2026-05');

    httpMock.expectOne('/api/rrhh/persona').flush({
      data: [{ id: 7, empleadoId: 42, nombreCompleto: 'Ana', dni: '11223344', email: 'a@b.pe' }],
    });
    httpMock.expectOne('/api/rrhh/generador-planilla/resumen/99/2026-05').flush({
      data: { empleadoId: 99, periodo: '2026-05', totalIngresos: 0, totalDescuentos: 0, netoPagar: 0 },
    });

    expect(fixture.componentInstance.persona()).toBeNull();
  });

  it('redirige a /planilla/movimientos si :empleadoId es inválido', () => {
    build('xyz', '2026-05');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/movimientos']);
  });

  it('fmtMonto formatea con separadores es-PE y 2 decimales', () => {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: [] });
    httpMock.expectOne('/api/rrhh/generador-planilla/resumen/42/2026-05').flush({
      data: { empleadoId: 42, periodo: '2026-05', totalIngresos: 0, totalDescuentos: 0, netoPagar: 0 },
    });
    const out = fixture.componentInstance.fmtMonto(1234567.5);
    expect(out).toContain('1');
    expect(out).toMatch(/[.,]50$/); // 2 decimales al final
  });
});
