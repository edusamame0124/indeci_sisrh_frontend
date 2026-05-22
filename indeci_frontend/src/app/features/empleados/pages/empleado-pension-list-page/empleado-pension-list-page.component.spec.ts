import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoPensionListPageComponent } from './empleado-pension-list-page.component';
import type { EmpleadoPensionRow } from '../../models/empleado-pension.model';

describe('EmpleadoPensionListPageComponent (Hotfix Pensión)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute() {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: { get: (k: string) => (k === 'personaId' ? '7' : null) },
        },
      },
    };
  }

  function buildFixture() {
    TestBed.configureTestingModule({
      imports: [EmpleadoPensionListPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    return TestBed.createComponent(EmpleadoPensionListPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('expone las columnas del nuevo contrato (sin afpId, con régimen y comisión denormalizados)', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect([...comp.columns].sort()).toEqual(
      ['tipoRegimen', 'regimen', 'cuspp', 'comision', 'aporte', 'acciones'].sort(),
    );
  });

  it('fmtPct formatea valor numérico y maneja null', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.fmtPct(null)).toBe('—');
    expect(comp.fmtPct(10.5)).toBe('10.5%');
  });

  it('pagedRows respeta paginación local', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    const sample: EmpleadoPensionRow[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      regimenPensionarioId: 1,
      cuspp: '',
      porcentajeAporte: 10,
      porcentajeComision: 1.5,
      porcentajeSeguro: 1.36,
      tipoComisionAfpId: 1,
      tipoRegimen: 'AFP',
      activo: 1,
      regimenPensionario: 'INTEGRA',
      tipoComisionAfp: 'POR FLUJO',
    }));
    comp.rows.set(sample);
    comp.pageSize.set(10);
    expect(comp.pagedRows().length).toBe(10);
    comp.pageIndex.set(1);
    expect(comp.pagedRows().length).toBe(5);
  });
});
