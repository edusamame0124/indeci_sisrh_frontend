import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BancoCatalogPageComponent } from './banco-catalog-page.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

describe('BancoCatalogPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BancoCatalogPageComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MatSnackBar,
          useValue: { open: () => undefined },
        },
      ],
    });
    setMatIconDefaultFontSetForTests();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('carga listado GET bancos', () => {
    const fixture = TestBed.createComponent(BancoCatalogPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/catalogos/bancos');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ id: 1, name: 'BBVA' }] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('BBVA');
  });

  it('tabla usa scroll horizontal, paginador accesible y acciones solo ícono con aria-label', () => {
    const fixture = TestBed.createComponent(BancoCatalogPageComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    httpMock.expectOne('/api/catalogos/bancos').flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [{ id: 1, name: 'BBVA' }],
    });
    fixture.detectChanges();

    expect(host.querySelector('.sisrh-table-scroll table.tbl')).toBeTruthy();

    const paginator = host.querySelector('mat-paginator');
    expect(paginator).toBeTruthy();
    expect(paginator?.getAttribute('aria-label')).toBe('Paginador catálogo de bancos');

    const actionButtons = host.querySelectorAll('td button.mat-mdc-icon-button');
    expect(actionButtons.length).toBe(2);
    expect(actionButtons[0]?.getAttribute('aria-label')).toContain('Editar banco BBVA');
    expect(actionButtons[1]?.getAttribute('aria-label')).toContain('Dar de baja banco BBVA');

    const icons = host.querySelectorAll('button.mat-mdc-icon-button mat-icon');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => {
      expect(icon.classList.contains('material-symbols-outlined')).toBe(true);
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
