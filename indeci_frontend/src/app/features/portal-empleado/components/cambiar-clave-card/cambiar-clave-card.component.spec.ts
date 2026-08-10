import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CambiarClaveCardComponent } from './cambiar-clave-card.component';
import { NotificacionService } from '../../../../core/services/notificacion.service';

describe('CambiarClaveCardComponent', () => {
  let httpMock: HttpTestingController;
  let notificacion: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CambiarClaveCardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync('noop')],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notificacion = TestBed.inject(NotificacionService);
    // El toast real abre un overlay CDK (MatSnackBar) vía setTimeout diferido;
    // aquí solo interesa verificar que el componente lo invoca, no ejercitar
    // el overlay (evita carreras del CDK ajenas a este componente).
    vi.spyOn(notificacion, 'exito').mockImplementation(() => undefined);
  });

  afterEach(() => httpMock.verify());

  function crear() {
    const fixture = TestBed.createComponent(CambiarClaveCardComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('inicia colapsado', () => {
    const fixture = crear();
    expect(fixture.componentInstance.expandido()).toBe(false);
  });

  it('activar() expande el formulario', () => {
    const fixture = crear();
    fixture.componentInstance.activar();
    expect(fixture.componentInstance.expandido()).toBe(true);
  });

  it('formulario inválido si la nueva clave no cumple la política de complejidad', () => {
    const fixture = crear();
    fixture.componentInstance.activar();

    fixture.componentInstance.form.setValue({
      claveActual: 'ActualS3g!',
      claveNueva: 'abc',
      claveConfirmar: 'abc',
    });

    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('formulario inválido si la confirmación no coincide', () => {
    const fixture = crear();
    fixture.componentInstance.activar();

    fixture.componentInstance.form.setValue({
      claveActual: 'ActualS3g!',
      claveNueva: 'NuevaClave2026!',
      claveConfirmar: 'OtraClave2026!',
    });
    fixture.componentInstance.form.controls.claveConfirmar.markAsTouched();

    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.passwordsMismatch()).toBe(true);
  });

  it('submit válido hace POST a persona/me/clave y colapsa la tarjeta al éxito', () => {
    const fixture = crear();
    fixture.componentInstance.activar();

    fixture.componentInstance.form.setValue({
      claveActual: 'ActualS3g!',
      claveNueva: 'NuevaClave2026!',
      claveConfirmar: 'NuevaClave2026!',
    });
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne('/api/rrhh/persona/me/clave');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      claveActual: 'ActualS3g!',
      claveNueva: 'NuevaClave2026!',
    });
    req.flush({ estado: 'OK', mensaje: 'Contraseña actualizada correctamente', data: null });

    expect(fixture.componentInstance.expandido()).toBe(false);
    expect(fixture.componentInstance.form.value.claveActual).toBe('');
    expect(notificacion.exito).toHaveBeenCalled();
  });

  it('error 400 (clave actual incorrecta) muestra mensaje y mantiene el formulario abierto', () => {
    const fixture = crear();
    fixture.componentInstance.activar();

    fixture.componentInstance.form.setValue({
      claveActual: 'Equivocada1!',
      claveNueva: 'NuevaClave2026!',
      claveConfirmar: 'NuevaClave2026!',
    });
    fixture.componentInstance.guardar();

    httpMock.expectOne('/api/rrhh/persona/me/clave').flush(
      { status: 400, mensaje: 'La contraseña actual no es correcta', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(fixture.componentInstance.expandido()).toBe(true);
    expect(fixture.componentInstance.errorMensaje()).toContain('contraseña actual no es correcta');
  });
});
