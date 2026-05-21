import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AdminRolesPageComponent } from './admin-roles-page.component';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

describe('AdminRolesPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminRolesPageComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    setMatIconDefaultFontSetForTests();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('muestra page shell y tabla cuando la carga es exitosa', () => {
    const fixture = TestBed.createComponent(AdminRolesPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('/roles') && r.method === 'GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data: [{ codigo: 'R1', nombre: 'Admin', activo: 'S' }] });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.page-card.sisrh-elevated')).toBeTruthy();
    expect(host.textContent).toContain('Admin');
  });

  it('muestra empty-state de error con role alert cuando falla la carga', () => {
    const fixture = TestBed.createComponent(AdminRolesPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('/roles') && r.method === 'GET');
    req.flush({ estado: 'ERROR', mensaje: 'Fallo de prueba' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const errorState = host.querySelector('.sisrh-empty-state--error');
    expect(errorState).toBeTruthy();
    expect(errorState?.getAttribute('role')).toBe('alert');
    expect(host.textContent).toContain('Reintentar');
    expect(host.querySelector('table.tbl')).toBeFalsy();
  });
});
