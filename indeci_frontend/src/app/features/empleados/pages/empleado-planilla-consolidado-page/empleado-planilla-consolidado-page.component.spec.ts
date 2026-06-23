import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoPlanillaConsolidadoPageComponent } from './empleado-planilla-consolidado-page.component';

describe('EmpleadoPlanillaConsolidadoPageComponent', () => {
  let httpMock: HttpTestingController;

  function buildFixture() {
    TestBed.configureTestingModule({
      imports: [EmpleadoPlanillaConsolidadoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(EmpleadoPlanillaConsolidadoPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('expone columnas compactas sin tipo contrato ni sueldo básico', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.columns).not.toContain('tipoContrato');
    expect(comp.columns).not.toContain('sueldo');
    expect(comp.columns).toContain('airhsp');
    expect(comp.columns).toContain('montoBase');
    expect(comp.columns).toContain('remMensual');
  });

  it('fmtAirhsp y fmtMoney manejan null', () => {
    const fixture = buildFixture();
    const comp = fixture.componentInstance;
    expect(comp.fmtAirhsp(null)).toBe('—');
    expect(comp.fmtMoney(null)).toBe('—');
    expect(comp.fmtMoney(4864.19)).toBe(
      (4864.19).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
  });
});
