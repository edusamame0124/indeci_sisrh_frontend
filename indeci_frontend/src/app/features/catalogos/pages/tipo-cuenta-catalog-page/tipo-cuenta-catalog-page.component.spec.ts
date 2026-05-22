import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TipoCuentaCatalogPageComponent } from './tipo-cuenta-catalog-page.component';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

describe('TipoCuentaCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TipoCuentaCatalogPageComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    });
    setMatIconDefaultFontSetForTests();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('carga listado GET tipos de cuenta', () => {
    const fixture = TestBed.createComponent(TipoCuentaCatalogPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/catalogos/tipos-cuenta');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, name: 'AHORROS' }] });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('AHORROS');
    expect(host.querySelector('.page-card.sisrh-elevated')).toBeTruthy();
  });

  it('muestra empty-state de error cuando falla la carga inicial', () => {
    const fixture = TestBed.createComponent(TipoCuentaCatalogPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/catalogos/tipos-cuenta');
    req.flush({ estado: 'ERROR', mensaje: 'Servicio no disponible' }, { status: 503, statusText: 'Error' });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.sisrh-empty-state--error[role="alert"]')).toBeTruthy();
    expect(host.textContent).toContain('Reintentar');
  });
});
