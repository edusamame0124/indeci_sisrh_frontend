import { Component } from '@angular/core';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { AdminUsersPageComponent } from './admin-users-page.component';
import { AdminSetPasswordDialogComponent } from './components/admin-set-password-dialog/admin-set-password-dialog.component';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { AuthService } from '../../../../core/services/auth.service';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

@Component({ standalone: true, selector: 'app-admin-users-route-blank', template: '' })
class AdminUsersRouteBlankComponent {}

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('AdminUsersPageComponent — UI tabla', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
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

  afterEach(() => {
    httpMock.match((r) => r.url.includes('/api/admin/sistemas')).forEach((r) => r.flush({ data: [] }));
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  const futureExp = Math.floor(Date.now() / 1000) + 900;

  function flushUsersList(): void {
    const req = httpMock.expectOne((r) => r.url === '/api/admin/users');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: {
        content: [{ id: 42, username: 'jdoe', nombreCompleto: 'JUAN DOE PEREZ', status: 'ACTIVE' }],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      },
    });
  }

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

  it('muestra la columna Nombre Completo', () => {
    const fixture = TestBed.createComponent(AdminUsersPageComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    flushUsersList();
    fixture.detectChanges();

    expect(host.textContent).toContain('JUAN DOE PEREZ');
  });

  it('oculta el botón "Cambiar contraseña" si el usuario NO es SUPER_ADMIN', () => {
    const fixture = TestBed.createComponent(AdminUsersPageComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    flushUsersList();
    fixture.detectChanges();

    const boton = host.querySelector('button[aria-label="Cambiar contraseña de jdoe"]');
    expect(boton).toBeNull();
  });

  it('muestra el botón "Cambiar contraseña" si el usuario es SUPER_ADMIN', () => {
    const auth = TestBed.inject(AuthService);
    auth.setTemporalToken(
      makeJwt({ sub: 'admin', roles: ['SUPER_ADMIN'], permisos: [], exp: futureExp }),
    );

    const fixture = TestBed.createComponent(AdminUsersPageComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    flushUsersList();
    fixture.detectChanges();

    const boton = host.querySelector('button[aria-label="Cambiar contraseña de jdoe"]');
    expect(boton).toBeTruthy();
  });

  it('abrirCambiarClave() abre el modal con los datos de la fila', () => {
    const fixture = TestBed.createComponent(AdminUsersPageComponent);
    fixture.detectChanges();
    flushUsersList();
    fixture.detectChanges();

    // La instancia de MatDialog que resuelve DI para este componente no coincide
    // con la que devuelve TestBed.inject(MatDialog) en este entorno de test
    // (MatDialogModule registra su propio provider al importarse en un
    // standalone component) — se espía la instancia real que el componente usa.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openSpy = vi
      .spyOn((fixture.componentInstance as any).dialog as MatDialog, 'open')
      .mockReturnValue({} as ReturnType<MatDialog['open']>);

    fixture.componentInstance.abrirCambiarClave({
      id: 42,
      username: 'jdoe',
      nombreCompleto: 'JUAN DOE PEREZ',
      status: 'ACTIVE',
    });

    expect(openSpy).toHaveBeenCalledWith(
      AdminSetPasswordDialogComponent,
      expect.objectContaining({
        data: { userId: 42, username: 'jdoe', nombreCompleto: 'JUAN DOE PEREZ' },
      }),
    );
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
