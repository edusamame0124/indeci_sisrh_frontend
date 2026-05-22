import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TransparenciaPageComponent } from './transparencia-page.component';
import type {
  TransparenciaPeriodo,
  TransparenciaRemuneracion,
} from '../../models/transparencia.model';

describe('TransparenciaPageComponent (Spec 011 / B4 — M10 Ley 27806)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [TransparenciaPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TransparenciaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  const periodo = (clave: string, estado: string): TransparenciaPeriodo => ({
    periodo: clave,
    estado,
  });

  const remun = (
    empleado: string,
    regimen: string,
    bruta: number,
  ): TransparenciaRemuneracion => ({ empleado, regimen, remuneracionBruta: bruta });

  it('al cargar pide periodos, selecciona el primero y pide sus remuneraciones', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/transparencia/periodos')
      .flush({ data: [periodo('2026-05', 'CERRADO'), periodo('2026-04', 'APROBADO')] });
    httpMock
      .expectOne('/api/transparencia/remuneraciones/2026-05')
      .flush({ data: [remun('Ana Lopez', '276', 3000), remun('Beto Diaz', 'CAS', 2000)] });

    const comp = fixture.componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.remuneraciones().length).toBe(2);
  });

  it('totalBruto() suma la remuneración bruta publicada', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/transparencia/periodos')
      .flush({ data: [periodo('2026-05', 'CERRADO')] });
    httpMock
      .expectOne('/api/transparencia/remuneraciones/2026-05')
      .flush({ data: [remun('Ana Lopez', '276', 3000), remun('Beto Diaz', 'CAS', 2000)] });

    expect(fixture.componentInstance.totalBruto()).toBe(5000);
  });

  it('cambiar de período recarga las remuneraciones', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/transparencia/periodos')
      .flush({ data: [periodo('2026-05', 'CERRADO'), periodo('2026-04', 'APROBADO')] });
    httpMock.expectOne('/api/transparencia/remuneraciones/2026-05').flush({ data: [] });

    fixture.componentInstance.onPeriodoChange('2026-04');
    httpMock
      .expectOne('/api/transparencia/remuneraciones/2026-04')
      .flush({ data: [remun('Ana Lopez', '276', 3000)] });

    expect(fixture.componentInstance.periodoSeleccionado()).toBe('2026-04');
    expect(fixture.componentInstance.remuneraciones().length).toBe(1);
  });

  it('sin periodos publicados queda en estado vacío sin pedir remuneraciones', () => {
    const fixture = build();
    httpMock.expectOne('/api/transparencia/periodos').flush({ data: [] });

    const comp = fixture.componentInstance;
    expect(comp.periodos().length).toBe(0);
    expect(comp.periodoSeleccionado()).toBeNull();
    expect(comp.loading()).toBe(false);
  });

  it('si falla la carga de periodos muestra el mensaje de error', () => {
    const fixture = build();
    httpMock
      .expectOne('/api/transparencia/periodos')
      .flush({ estado: 'ERROR', mensaje: 'fallo', data: null }, {
        status: 500,
        statusText: 'Server Error',
      });

    expect(fixture.componentInstance.error()).not.toBeNull();
  });
});
