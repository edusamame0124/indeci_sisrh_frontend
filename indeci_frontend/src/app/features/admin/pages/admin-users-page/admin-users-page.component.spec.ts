import { Component } from '@angular/core';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { AdminUsersPageComponent } from './admin-users-page.component';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

@Component({ standalone: true, selector: 'app-admin-users-route-blank', template: '' })
class AdminUsersRouteBlankComponent {}

describe('AdminUsersPageComponent — UI tabla', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminUsersPageComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'admin/usuarios/:id', component: AdminUsersRouteBlankComponent },
          { path: 'admin/usuarios/nueva', component: AdminUsersRouteBlankComponent },
        ]),
        { provide: MatSnackBar, useValue: { open: () => undefined } },
        { provide: ClientTelemetryService, useValue: { track: vi.fn() } },
      ],
    });
    setMatIconDefaultFontSetForTests();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('scroll horizontal, paginador y acciones homogéneas (ícono + aria)', () => {
    const fixture = TestBed.createComponent(AdminUsersPageComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/admin/users');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: {
        content: [{ id: 42, username: 'jdoe', status: 'ACTIVE' }],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      },
    });
    fixture.detectChanges();

    expect(host.querySelector('.sisrh-table-scroll table.tbl')).toBeTruthy();

    const paginator = host.querySelector('mat-paginator');
    expect(paginator?.getAttribute('aria-label')).toBe('Paginador de usuarios');

    const rowLink = host.querySelector('td a.mat-mdc-icon-button');
    expect(rowLink?.getAttribute('aria-label')).toBe('Abrir ficha del usuario jdoe');

    const icon = host.querySelector('td a.mat-mdc-icon-button mat-icon');
    expect(icon?.classList.contains('material-symbols-outlined')).toBe(true);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('muestra empty-state de error cuando falla la carga', () => {
    const fixture = TestBed.createComponent(AdminUsersPageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === '/api/admin/users');
    req.flush({ estado: 'ERROR', mensaje: 'Fallo' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.sisrh-empty-state--error[role="alert"]')).toBeTruthy();
    expect(host.textContent).toContain('Reintentar');
  });
});
