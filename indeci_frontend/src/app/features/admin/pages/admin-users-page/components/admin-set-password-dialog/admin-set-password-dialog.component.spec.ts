import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import {
  AdminSetPasswordDialogComponent,
  type AdminSetPasswordDialogData,
} from './admin-set-password-dialog.component';

describe('AdminSetPasswordDialogComponent', () => {
  let httpMock: HttpTestingController;
  let dialogRef: { close: (result?: boolean) => void };
  let toastrSuccess: ReturnType<typeof vi.fn>;
  const dialogData: AdminSetPasswordDialogData = {
    userId: 7,
    username: 'jperez',
    nombreCompleto: 'JUAN PEREZ',
  };

  beforeEach(() => {
    dialogRef = { close: () => undefined };
    toastrSuccess = vi.fn();
    TestBed.configureTestingModule({
      imports: [AdminSetPasswordDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: ToastrService, useValue: { success: toastrSuccess, error: vi.fn() } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function crear() {
    const fixture = TestBed.createComponent(AdminSetPasswordDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('formulario inválido si la nueva clave no cumple la política de complejidad', () => {
    const fixture = crear();
    fixture.componentInstance.form.setValue({ claveNueva: 'abc', claveConfirmar: 'abc' });
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('formulario inválido si la confirmación no coincide', () => {
    const fixture = crear();
    fixture.componentInstance.form.setValue({
      claveNueva: 'NuevaClave2026!',
      claveConfirmar: 'OtraClave2026!',
    });
    fixture.componentInstance.form.controls.claveConfirmar.markAsTouched();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.passwordsMismatch()).toBe(true);
  });

  it('submit válido hace POST a /api/admin/users/{id}/clave y cierra el diálogo con true', () => {
    const fixture = crear();
    let cerradoCon: boolean | undefined;
    dialogRef.close = (result?: boolean) => {
      cerradoCon = result;
    };

    fixture.componentInstance.form.setValue({
      claveNueva: 'NuevaClave2026!',
      claveConfirmar: 'NuevaClave2026!',
    });
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne('/api/admin/users/7/clave');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ claveNueva: 'NuevaClave2026!' });
    req.flush({
      estado: 'OK',
      mensaje: 'Contraseña temporal asignada. El usuario deberá definir una nueva al ingresar.',
      data: null,
    });

    expect(cerradoCon).toBe(true);
    expect(toastrSuccess).toHaveBeenCalledWith(
      expect.stringContaining('nueva al ingresar'),
      expect.stringContaining('jperez'),
    );
  });

  it('error 400 del backend muestra mensaje y no cierra el diálogo', () => {
    const fixture = crear();
    let cerrado = false;
    dialogRef.close = () => {
      cerrado = true;
    };

    fixture.componentInstance.form.setValue({
      claveNueva: 'NuevaClave2026!',
      claveConfirmar: 'NuevaClave2026!',
    });
    fixture.componentInstance.guardar();

    httpMock.expectOne('/api/admin/users/7/clave').flush(
      { status: 400, mensaje: 'Usuario no encontrado', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(cerrado).toBe(false);
    expect(fixture.componentInstance.errorMensaje()).toBeTruthy();
  });
});
